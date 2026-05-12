export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'SHOW_WARNING_POPUP') {
        const { reputation, isCustomBlacklist } = message;
        
        // Verifica se já existe um alerta para não duplicar
        if (document.getElementById('zero-phishing-warning-popup')) return;

        const overlay = document.createElement('div');
        overlay.id = 'zero-phishing-warning-popup';
        
        const isDanger = reputation === 'danger';
        const color = isDanger ? '#dc2626' : '#ca8a04';
        
        // Custom message logic
        let title = '';
        let messageText = '';
        if (isCustomBlacklist) {
          title = '🚫 Site Bloqueado pelo Administrador';
          messageText = 'Este site foi <strong>bloqueado manualmente</strong> nas configurações do Zero Phishing e não pode ser acessado.';
        } else {
          title = isDanger ? '⚠️ Site Perigoso Bloqueado!' : '⚠️ Site Suspeito!';
          messageText = `O <strong>Zero Phishing</strong> detectou que este site tem reputação <strong>${isDanger ? 'ruim' : 'suspeita'}</strong>.
            ${isDanger ? 'Recomendamos que você saia imediatamente.' : 'Tome cuidado ao fornecer informações pessoais.'}`;
        }

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

        const iconSvg = isCustomBlacklist 
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

        modal.innerHTML = `
          <div style="margin-bottom: 16px;">${iconSvg}</div>
          <h1 style="color: ${color}; font-size: 24px; font-weight: bold; margin: 0 0 12px 0;">${title}</h1>
          <p style="font-size: 16px; margin: 0 0 24px 0; line-height: 1.5;">${messageText}</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="zp-leave-btn" style="
              background: ${color}; color: white; border: none; padding: 12px 24px; 
              border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;
            ">Voltar</button>
            ${!isCustomBlacklist ? `<button id="zp-continue-btn" style="
              background: transparent; color: #64748b; border: 1px solid #cbd5e1; 
              padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;
            ">Ignorar e Continuar</button>` : ''}
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

    // Inicia a verificação de links na página
    verifyLinksOnPage();
  },
});

function verifyLinksOnPage() {
  const currentHost = window.location.hostname;

  // Usa IntersectionObserver para verificar os links apenas quando eles aparecem na tela
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const link = entry.target as HTMLAnchorElement;
        
        // Remove do observer para não checar mais de uma vez
        observer.unobserve(link);

        checkSingleLink(link);
      }
    });
  }, { rootMargin: '100px' });

  // Pega uma lista estática incial de links
  const links = Array.from(document.querySelectorAll('a[href]'));

  links.forEach((link) => {
    const anchor = link as HTMLAnchorElement;
    try {
      const url = new URL(anchor.href);
      // Checa somente links externos usando http ou https
      if (url.hostname !== currentHost && (url.protocol === 'http:' || url.protocol === 'https:')) {
        anchor.dataset.zpStatus = 'pending';
        
        // Adiciona um ícone inicial
        const icon = document.createElement('span');
        icon.className = 'zp-link-indicator';
        icon.innerHTML = `<svg style="vertical-align: middle; margin-left: 4px;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
        icon.style.cssText = 'text-decoration: none; display: inline-block; cursor: help;';
        icon.title = 'O Zero Phishing está avaliando a segurança deste link...';
        
        anchor.appendChild(icon);

        observer.observe(anchor);
      }
    } catch {
      // Ignora URLs inválidas (e.g., mailto:, javascript:)
    }
  });

  // Listener para novos links adicionados dinamicamente na página (SPA e Infinite Scroll)
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const newLinks = element.tagName === 'A' ? [element] : Array.from(element.querySelectorAll('a[href]'));
          
          newLinks.forEach((newLink) => {
            const anchor = newLink as HTMLAnchorElement;
            try {
              const url = new URL(anchor.href);
              if (url.hostname !== currentHost && (url.protocol === 'http:' || url.protocol === 'https:') && !anchor.dataset.zpStatus) {
                anchor.dataset.zpStatus = 'pending';
                
                const icon = document.createElement('span');
                icon.className = 'zp-link-indicator';
                icon.innerHTML = `<svg style="vertical-align: middle; margin-left: 4px;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
                icon.style.cssText = 'text-decoration: none; display: inline-block; cursor: help;';
                icon.title = 'O Zero Phishing está avaliando a segurança deste link...';
                
                anchor.appendChild(icon);
                observer.observe(anchor);
              }
            } catch {}
          });
        }
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

async function checkSingleLink(link: HTMLAnchorElement) {
  try {
    const icon = link.querySelector('.zp-link-indicator') as HTMLElement;
    if (!icon) return;

    icon.innerText = ' ⏳'; // Carregando

    browser.runtime.sendMessage({ type: 'CHECK_URL', url: link.href }, (response) => {
      if (browser.runtime.lastError) {
        icon.remove();
        return;
      }

      if (response && response.safe === false) {
        link.dataset.zpStatus = 'danger';
        icon.innerText = ' ❌';
        icon.title = 'Aviso: Este link foi identificado como inseguro ou malicioso!';
        link.style.borderBottom = '2px dashed #ef4444'; // Alerta visual sutil associado ao link
      } else if (response && response.safe === true && !response.skipped) {
        link.dataset.zpStatus = 'safe';
        icon.innerText = ' ✅';
        icon.title = 'Este link foi verificado e é seguro.';
      } else {
        // Ignorado por erro de API local, etc. Não vamos assustar o usuário com falsos positivos.
        icon.remove();
      }
    });
  } catch {
    const icon = link.querySelector('.zp-link-indicator');
    if (icon) icon.remove();
  }
}
