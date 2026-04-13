# [CORE] Verificar URL atual contra API de phishing — Issue #1

## O que foi implementado

Solução completa para a User Story:
> "Como usuário, quero que a extensão verifique automaticamente a URL atual contra uma API de phishing/malware ao carregar qualquer página."

---

## Arquivos criados/modificados

| Arquivo | Função |
|---|---|
| `background.js` | Service worker principal — faz as chamadas às APIs |
| `content.js` | Injeta banner de alerta vermelho na página |
| `popup.html` / `popup.js` | UI do popup com status detalhado |
| `manifest.json` | Permissões necessárias |

---

## Fluxo de funcionamento

```
Usuário abre página
      ↓
chrome.tabs.onUpdated (status === "complete")
      ↓
background.js → checkUrl(url)
      ├── checkGoogleSafeBrowsing(url)   → Google Safe Browsing API v4
      └── checkVirusTotal(url)           → VirusTotal API v3
      ↓
Promise.allSettled (ambas em paralelo)
      ↓
Se ameaça detectada:
  ├── chrome.notifications → notificação do sistema
  ├── chrome.action.setBadgeText("!") → badge vermelho
  └── sendMessage → content.js → banner vermelho na página
      ↓
Se seguro:
  └── chrome.action.setBadgeText("✓") → badge verde
```

---

## APIs utilizadas

### Google Safe Browsing v4
- **Endpoint:** `POST /v4/threatMatches:find`
- **Detecta:** MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE, POTENTIALLY_HARMFUL_APPLICATION
- **Chave:** `GOOGLE_SAFE_BROWSING_API_KEY` no `background.js`
- **Documentação:** https://developers.google.com/safe-browsing/v4

### VirusTotal v3
- **Endpoint:** `POST /api/v3/urls` + `GET /api/v3/urls/{id}`
- **Detecta:** resultado agregado de 70+ engines antivírus
- **Chave:** `VIRUSTOTAL_API_KEY` no `background.js`
- **Documentação:** https://developers.virustotal.com/reference/url-object

---

## Como configurar as chaves de API

No arquivo `background.js`, substitua:

```js
const CONFIG = {
  GOOGLE_SAFE_BROWSING_API_KEY: "YOUR_GOOGLE_API_KEY",   // ← sua chave aqui
  VIRUSTOTAL_API_KEY: "YOUR_VIRUSTOTAL_API_KEY",          // ← sua chave aqui
  ...
};
```

- **Google:** https://console.cloud.google.com → ativar "Safe Browsing API"
- **VirusTotal:** https://www.virustotal.com/gui/my-apikey (gratuito)

---

## Otimizações implementadas

- **Cache em memória** de 10 minutos — evita chamadas redundantes para a mesma URL
- **Promise.allSettled** — ambas as APIs são consultadas em paralelo
- **Fallback gracioso** — se uma API falhar, a outra ainda é considerada
- **Filtro de URLs** — ignora `chrome://`, `about:`, `file:`, etc.

---

## Como instalar para testar

1. Abra `chrome://extensions/`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `zero-phishing/`
