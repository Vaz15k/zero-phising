// background.js - Service Worker for Zero Phishing Extension

const CONFIG = {
  GOOGLE_SAFE_BROWSING_API_KEY: "AIzaSyC4cyLSVvg9nnXvOH36qtLL-oQ-KE9sGZE",
  VIRUSTOTAL_API_KEY: "8d4b091d1e0807d4c644985e17f40610a95899697fd3a9c99623ed142e311d63",
  GOOGLE_SAFE_BROWSING_URL:
    "https://safebrowsing.googleapis.com/v4/threatMatches:find",
  VIRUSTOTAL_URL: "https://www.virustotal.com/api/v3/urls",
  CACHE_DURATION_MS: 10 * 60 * 1000, // 10 minutes
};

// In-memory cache to avoid redundant API calls
const urlCache = new Map();

/**
 * Checks if a cached result is still valid
 */
function isCacheValid(entry) {
  return Date.now() - entry.timestamp < CONFIG.CACHE_DURATION_MS;
}

/**
 * Checks a URL against Google Safe Browsing API
 * @param {string} url
 * @returns {Promise<{safe: boolean, threats: Array}>}
 */
async function checkGoogleSafeBrowsing(url) {
  const body = {
    client: { clientId: "zero-phishing-extension", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  const response = await fetch(
    `${CONFIG.GOOGLE_SAFE_BROWSING_URL}?key=${CONFIG.GOOGLE_SAFE_BROWSING_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Safe Browsing API error: ${response.status}`);
  }

  const data = await response.json();
  const threats = data.matches || [];

  return {
    safe: threats.length === 0,
    threats: threats.map((t) => ({
      type: t.threatType,
      platform: t.platformType,
    })),
  };
}

/**
 * Checks a URL against VirusTotal API
 * @param {string} url
 * @returns {Promise<{safe: boolean, stats: Object, permalink: string}>}
 */
async function checkVirusTotal(url) {
  // Step 1: Submit URL for analysis
  const encodedUrl = btoa(url).replace(/=/g, "");

  const submitResponse = await fetch(CONFIG.VIRUSTOTAL_URL, {
    method: "POST",
    headers: {
      "x-apikey": CONFIG.VIRUSTOTAL_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  if (!submitResponse.ok) {
    throw new Error(`VirusTotal submit error: ${submitResponse.status}`);
  }

  // Step 2: Get analysis result using URL ID
  const urlId = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  
  const resultResponse = await fetch(
    `${CONFIG.VIRUSTOTAL_URL}/${urlId}`,
    {
      headers: { "x-apikey": CONFIG.VIRUSTOTAL_API_KEY },
    }
  );

  if (!resultResponse.ok) {
    throw new Error(`VirusTotal result error: ${resultResponse.status}`);
  }

  const data = await resultResponse.json();
  const stats = data.data?.attributes?.last_analysis_stats || {};
  const malicious = (stats.malicious || 0) + (stats.suspicious || 0);

  return {
    safe: malicious === 0,
    stats,
    permalink: `https://www.virustotal.com/gui/url/${urlId}`,
    maliciousCount: malicious,
    totalEngines: Object.values(stats).reduce((a, b) => a + b, 0),
  };
}

/**
 * Main function: checks URL against both APIs
 * @param {string} url
 * @returns {Promise<{safe: boolean, google: Object, virustotal: Object}>}
 */
async function checkUrl(url) {
  // Skip non-HTTP URLs (chrome://, about:, file:, etc.)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { safe: true, skipped: true };
  }

  // Check cache
  if (urlCache.has(url)) {
    const cached = urlCache.get(url);
    if (isCacheValid(cached)) {
      console.log(`[Zero Phishing] Cache hit for: ${url}`);
      return cached.result;
    }
    urlCache.delete(url);
  }

  console.log(`[Zero Phishing] Checking URL: ${url}`);

  const [googleResult, vtResult] = await Promise.allSettled([
    checkGoogleSafeBrowsing(url),
    checkVirusTotal(url),
  ]);

  const google =
    googleResult.status === "fulfilled"
      ? googleResult.value
      : { error: googleResult.reason?.message, safe: true };

  const virustotal =
    vtResult.status === "fulfilled"
      ? vtResult.value
      : { error: vtResult.reason?.message, safe: true };

  const isSafe = google.safe && virustotal.safe;

  const result = { safe: isSafe, google, virustotal, checkedAt: Date.now() };

  // Store in cache
  urlCache.set(url, { result, timestamp: Date.now() });

  return result;
}

/**
 * Notifies the user about a dangerous URL
 */
function notifyDanger(url, result) {
  const threats = [];

  if (!result.google.safe && result.google.threats?.length) {
    result.google.threats.forEach((t) => threats.push(t.type));
  }

  if (!result.virustotal.safe) {
    threats.push(
      `VirusTotal: ${result.virustotal.maliciousCount}/${result.virustotal.totalEngines} engines`
    );
  }

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "⚠️ URL Perigosa Detectada!",
    message: `Esta página pode ser maliciosa.\n${threats.join(", ")}`,
    priority: 2,
  });
}

// Listen for tab updates (page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when the page finishes loading
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const result = await checkUrl(tab.url);

    if (result.skipped) return;

    // Send result to content script / popup
    chrome.tabs.sendMessage(tabId, {
      type: "URL_CHECK_RESULT",
      url: tab.url,
      result,
    }).catch(() => {}); // Tab may not have content script

    // Notify user if dangerous
    if (!result.safe) {
      notifyDanger(tab.url, result);
    }

    // Update extension badge
    chrome.action.setBadgeText({
      text: result.safe ? "✓" : "!",
      tabId,
    });

    chrome.action.setBadgeBackgroundColor({
      color: result.safe ? "#22c55e" : "#ef4444",
      tabId,
    });
  } catch (error) {
    console.error("[Zero Phishing] Error checking URL:", error);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_URL") {
    checkUrl(message.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_CACHE_SIZE") {
    sendResponse({ size: urlCache.size });
    return false;
  }

  if (message.type === "CLEAR_CACHE") {
    urlCache.clear();
    sendResponse({ success: true });
    return false;
  }
});
