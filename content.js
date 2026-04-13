// content.js - Injected into every page to show phishing warnings

(function () {
  "use strict";

  let warningBanner = null;

  /**
   * Creates and injects a warning banner at the top of the page
   */
  function showWarningBanner(result) {
    // Remove existing banner if any
    removeWarningBanner();

    const banner = document.createElement("div");
    banner.id = "zero-phishing-banner";

    const threats = [];
    if (!result.google?.safe && result.google?.threats?.length) {
      result.google.threats.forEach((t) => threats.push(t.type.replace(/_/g, " ")));
    }
    if (!result.virustotal?.safe) {
      threats.push(
        `VirusTotal: ${result.virustotal.maliciousCount}/${result.virustotal.totalEngines} engines`
      );
    }

    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 2147483647;
        background: linear-gradient(135deg, #991b1b, #dc2626);
        color: white;
        padding: 12px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      ">
        <span style="font-size: 22px;">⚠️</span>
        <div style="flex:1">
          <strong>Atenção: URL possivelmente maliciosa!</strong>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
            ${threats.length ? threats.join(" · ") : "Detectada como ameaça"}
          </div>
        </div>
        ${result.virustotal?.permalink ? `
        <a href="${result.virustotal.permalink}" target="_blank" style="
          color: white;
          font-size: 12px;
          text-decoration: underline;
          white-space: nowrap;
        ">Ver no VirusTotal</a>` : ""}
        <button onclick="document.getElementById('zero-phishing-banner').remove()" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
        ">Ignorar</button>
      </div>
    `;

    document.documentElement.prepend(banner);
    warningBanner = banner;

    // Push page content down
    document.body.style.marginTop =
      (parseInt(document.body.style.marginTop) || 0) + 60 + "px";
  }

  function removeWarningBanner() {
    if (warningBanner) {
      warningBanner.remove();
      warningBanner = null;
    }
    const existing = document.getElementById("zero-phishing-banner");
    if (existing) existing.remove();
  }

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "URL_CHECK_RESULT") {
      if (!message.result.safe && !message.result.skipped) {
        showWarningBanner(message.result);
      } else {
        removeWarningBanner();
      }
    }
  });
})();
