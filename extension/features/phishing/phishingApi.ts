// phishingApi.ts
// Wrapper functions for external phishing detection APIs.

/**
 * Checks a URL against Google Safe Browsing API v4.
 */
export async function checkGoogleSafeBrowsing(url: string) {
  const apiKey = import.meta.env.WXT_GSB_API_KEY;
  if (!apiKey) {
    return { error: 'Google Safe Browsing API key not set', safe: true };
  }

  const body = {
    client: { clientId: "zero-phishing-extension", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      return { error: `Google Safe Browsing request failed: ${resp.status}`, safe: true };
    }
    const data = await resp.json();
    const threats = data.matches || [];
    return {
      safe: threats.length === 0,
      threats: threats.map((t: any) => ({
        type: t.threatType,
        platform: t.platformType,
      })),
    };
  } catch (e: any) {
    return { error: `Error contacting Google Safe Browsing: ${e.message}`, safe: true };
  }
}

/**
 * Checks a URL against VirusTotal v3 API.
 */
export async function checkVirusTotal(url: string) {
  const apiKey = import.meta.env.WXT_VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return { error: 'VirusTotal API key not set', safe: true };
  }

  const headers = {
    'x-apikey': apiKey,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const postEndpoint = 'https://www.virustotal.com/api/v3/urls';
  const getUrlId = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  try {
    // 1. Submit
    const submitResp = await fetch(postEndpoint, {
      method: 'POST',
      headers,
      body: `url=${encodeURIComponent(url)}`,
    });
    
    if (!submitResp.ok) {
      return { error: `VirusTotal submit failed: ${submitResp.status}`, safe: true };
    }
    
    // 2. Get result
    const getEndpoint = `https://www.virustotal.com/api/v3/urls/${getUrlId}`;
    const resultResponse = await fetch(getEndpoint, {
      headers: { 'x-apikey': apiKey },
    });
    
    if (!resultResponse.ok) {
      return { error: `VirusTotal result failed: ${resultResponse.status}`, safe: true };
    }
    
    const data = await resultResponse.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
    
    return {
      safe: malicious === 0,
      stats,
      permalink: `https://www.virustotal.com/gui/url/${getUrlId}`,
      maliciousCount: malicious,
      totalEngines: Object.values(stats).reduce((a: any, b: any) => a + b, 0),
    };
  } catch (e: any) {
    return { error: `VirusTotal request error: ${e.message}`, safe: true };
  }
}
