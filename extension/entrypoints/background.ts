import { checkUrl } from '../features/phishing/phishingChecker';

export default defineBackground(() => {
  // Listen for tab updates (page loads)
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check when the page finishes loading
    if (changeInfo.status !== "complete" || !tab.url) return;

    try {
      const result = await checkUrl(tab.url);

      // Send result to content script / popup
      browser.tabs.sendMessage(tabId, {
        type: "URL_CHECK_RESULT",
        url: tab.url,
        result
      }).catch(() => {}); // Tab may not have content script

      // Notify user if dangerous
      if (!result.safe) {
        let reputation = 'danger';
        const vtMalicious = result.virustotal?.maliciousCount || 0;
        const googleUnsafe = !result.google?.error && !result.google?.safe;
        
        if (googleUnsafe || vtMalicious > 2) {
          reputation = 'danger';
        } else if (vtMalicious > 0 && vtMalicious <= 2) {
          reputation = 'warning';
        }

        // Send message to content script to show overlay popup
        browser.tabs.sendMessage(tabId, {
          type: "SHOW_WARNING_POPUP",
          reputation,
          result
        }).catch(() => {});

        browser.notifications.create({
          type: "basic",
          iconUrl: "icon/128.png",
          title: reputation === 'danger' ? "🚨 Site Perigoso Bloqueado!" : "⚠️ Site Suspeito!",
          message: "O Zero Phishing identificou que esta página pode ser maliciosa.",
          priority: 2,
        });
      }

      // Update extension badge
      browser.action.setBadgeText({
        text: result.safe ? "✓" : "!",
        tabId,
      });

      browser.action.setBadgeBackgroundColor({
        color: result.safe ? "#22c55e" : "#ef4444",
        tabId,
      });
    } catch (error) {
      console.error("[Zero Phishing] Error checking URL:", error);
    }
  });

  // Handle messages from popup or content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CHECK_URL") {
      checkUrl(message.url)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ safe: true, error: err.message }));
      return true; // Keep channel open for async response
    }
  });
});
