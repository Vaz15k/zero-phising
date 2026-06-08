import { checkUrl } from '../features/phishing/phishingChecker';

export default defineBackground(() => {
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Monitora o carregamento inicial
    if (changeInfo.status !== "loading" || !tab.url) return;
    
    // Ignora URLs internas
    if (!tab.url.startsWith('http')) return;
    if (tab.url.includes(browser.runtime.getURL(''))) return;

    try {
      const result = await checkUrl(tab.url);

      // Bloqueio: Somente se NÃO for seguro E NÃO for por causa da Whitelist
      if (!result.safe && result.reason !== 'whitelist') {
        const warningUrl = browser.runtime.getURL(`/warning.html?url=${encodeURIComponent(tab.url)}&reason=${result.reason || 'phishing'}`);
        
        console.log(`[Zero Phishing] REDIRECIONANDO PARA AVISO: ${tab.url}`);
        browser.tabs.update(tabId, { url: warningUrl });

        browser.notifications.create({
          type: "basic",
          iconUrl: "icon/128.png",
          title: "Acesso Bloqueado",
          message: "Este site foi identificado como uma ameaça ou está na sua blacklist.",
          priority: 2,
        });
      }

      // Atualiza o ícone (Badge)
      const isSafe = result.safe || result.reason === 'whitelist';
      browser.action.setBadgeText({
        text: isSafe ? "✓" : "!",
        tabId,
      });

      browser.action.setBadgeBackgroundColor({
        color: isSafe ? "#22c55e" : "#ef4444",
        tabId,
      });

    } catch (error) {
      console.error("[Zero Phishing] Erro no Background:", error);
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CHECK_URL") {
      checkUrl(message.url)
        .then(sendResponse)
        .catch((err) => sendResponse({ safe: true, error: err.message }));
      return true;
    }
  });
});
