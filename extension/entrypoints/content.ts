export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SHOW_WARNING_POPUP') {
        const { result, reputation } = message;
        
        // Verifica se já existe um alerta para não duplicar
        if (document.getElementById('zero-phishing-warning-popup')) return;

        const overlay = document.createElement('div');
        overlay.id = 'zero-phishing-warning-popup';
        
        const isDanger = reputation === 'danger';
        const color = isDanger ? '#dc2626' : '#ca8a04';
        const title = isDanger ? '⚠️ Site Perigoso Blockeado!' : '⚠️ Site Suspeito!';
        const bgColors = isDanger ? 'background: #fef2f2; border: 2px solid #dc2626;' : 'background: #fefce8; border: 2px solid #ca8a04;';
        
        overlay.style.cssText = `
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.8);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
          ${bgColors}
          padding: 30px;
          border-radius: 12px;
          max-width: 500px;
          text-align: center;
          color: #1e293b;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        `;

        modal.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">🚨</div>
          <h1 style="color: ${color}; font-size: 24px; font-weight: bold; margin: 0 0 12px 0;">${title}</h1>
          <p style="font-size: 16px; margin: 0 0 24px 0; line-height: 1.5;">
            O <strong>Zero Phishing</strong> detectou que este site tem reputação <strong>${isDanger ? 'ruim' : 'suspeita'}</strong>.
            ${isDanger ? 'Recomendamos que você saia imediatamente.' : 'Tome cuidado ao fornecer informações pessoais.'}
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="zp-leave-btn" style="
              background: ${color}; color: white; border: none; padding: 12px 24px; 
              border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;
            ">Voltar à Segurança</button>
            <button id="zp-continue-btn" style="
              background: transparent; color: #64748b; border: 1px solid #cbd5e1; 
              padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;
            ">Ignorar e Continuar</button>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('zp-leave-btn')?.addEventListener('click', () => {
          window.history.back();
          setTimeout(() => { window.location.href = 'https://google.com'; }, 500);
        });

        document.getElementById('zp-continue-btn')?.addEventListener('click', () => {
          overlay.remove();
        });
      }
    });
  },
});
