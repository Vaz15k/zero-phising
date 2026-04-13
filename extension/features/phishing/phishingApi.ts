// phishingApi.ts
// Wrapper functions for external phishing detection APIs.

interface GoogleSafeBrowsingRequest {
  client: {
    clientId: string;
    clientVersion: string;
  };
  threatInfo: {
    threatTypes: string[]; // e.g., ["MALWARE", "SOCIAL_ENGINEERING", ...]
    platformTypes: string[]; // e.g., ["ANY_PLATFORM"]
    threatEntryTypes: string[]; // e.g., ["URL"]
    threatEntries: { url: string }[];
  };
}

interface GoogleSafeBrowsingMatch {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  threat: { url: string };
}

interface GoogleSafeBrowsingResponse {
  matches?: GoogleSafeBrowsingMatch[];
}

/**
 * Checks a URL against Google Safe Browsing API v4.
 * Returns true if any threat is found, false otherwise.
 */
export async function checkGoogleSafeBrowsing(url: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    console.warn('Google Safe Browsing API key not set');
    return false;
  }

  const requestBody: GoogleSafeBrowsingRequest = {
    client: {
      clientId: 'zero-phishing-extension',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: [
        'MALWARE',
        'SOCIAL_ENGINEERING',
        'UNWANTED_SOFTWARE',
        'POTENTIALLY_HARMFUL_APPLICATION',
      ],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }],
    },
  };

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!resp.ok) {
      console.error('Google Safe Browsing request failed', resp.status, resp.statusText);
      return false;
    }
    const data: GoogleSafeBrowsingResponse = await resp.json();
    return !!data.matches && data.matches.length > 0;
  } catch (e) {
    console.error('Error contacting Google Safe Browsing', e);
    return false;
  }
}

// VirusTotal API types
interface VirusTotalAnalysisStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

interface VirusTotalResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      last_analysis_stats: VirusTotalAnalysisStats;
    };
  };
}

/**
 * Checks a URL against VirusTotal v3 API.
 * Returns true if the analysis reports malicious or suspicious verdicts.
 */
export async function checkVirusTotal(url: string): Promise<boolean> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    console.warn('VirusTotal API key not set');
    return false;
  }

  // Compute SHA-256 hash of the URL for the GET endpoint
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const getEndpoint = `https://www.virustotal.com/api/v3/urls/${hashHex}`;
  const headers = { 'x-apikey': apiKey };

  // Try to fetch existing analysis
  try {
    const getResp = await fetch(getEndpoint, { headers });
    if (getResp.ok) {
      const vtData: VirusTotalResponse = await getResp.json();
      const stats = vtData.data.attributes.last_analysis_stats;
      return stats.malicious > 0 || stats.suspicious > 0;
    }
  } catch (e) {
    console.error('VirusTotal GET error', e);
  }

  // Submit URL for scanning if not found
  const postEndpoint = 'https://www.virustotal.com/api/v3/urls';
  const form = new URLSearchParams();
  form.append('url', url);
  try {
    const postResp = await fetch(postEndpoint, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!postResp.ok) {
      console.error('VirusTotal POST failed', postResp.status);
      return false;
    }
    // Poll the analysis shortly after submission
    const pollResp = await fetch(getEndpoint, { headers });
    if (!pollResp.ok) {
      console.error('VirusTotal poll after POST failed');
      return false;
    }
    const pollData: VirusTotalResponse = await pollResp.json();
    const stats = pollData.data.attributes.last_analysis_stats;
    return stats.malicious > 0 || stats.suspicious > 0;
  } catch (e) {
    console.error('VirusTotal request error', e);
    return false;
  }
}
