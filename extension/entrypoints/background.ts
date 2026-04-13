import { checkUrl } from '../features/phishing/phishingChecker';

export default defineBackground(() => {
  // Listen for tab updates (page loads)
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check when the page finishes loading
    if (changeInfo.status !== "complete" || !tab.url) return;

    try {
      const result = await checkUrl(tab.url);

      // Send result to content script / popup
      chrome.tabs.sendMessage(tabId, {
        type: "URL_CHECK_RESULT",
        url: tab.url,
        result
      }).catch(() => {}); // Tab may not have content script

      // Notify user if dangerous
      if (!result.safe) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon/128.png",
          title: "⚠️ URL Perigosa Detectada!",
          message: "Esta página pode ser maliciosa.",
          priority: 2,
        });
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
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ safe: true, error: err.message }));
      return true; // Keep channel open for async response
    }
  });
});
