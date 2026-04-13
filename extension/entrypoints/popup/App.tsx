import { useState, useEffect } from 'react';
import './style.css';

export default function App() {
  const [url, setUrl] = useState<string>("Obtendo URL atual...");
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<any>(null);

  const checkTab = async () => {
    setLoading(true);
    setResult(null);
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        setUrl(currentTab.url.length > 45 ? currentTab.url.slice(0, 42) + '...' : currentTab.url);
        browser.runtime.sendMessage(
          { type: 'CHECK_URL', url: currentTab.url },
          (response) => {
            setResult(response);
            setLoading(false);
          }
        );
      } else {
        setUrl("URL não disponível");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTab();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div id="status-card" className="status-card status-loading">
          <div className="status-icon">⏳</div>
          <div className="status-text">
            <h2>Verificando...</h2>
            <p id="current-url">{url}</p>
          </div>
        </div>
      );
    }

    if (!result) {
      return (
        <div id="status-card" className="status-card status-skipped">
          <div className="status-icon">ℹ️</div>
          <div className="status-text">
            <h2>Não suportado</h2>
            <p id="current-url">{url}</p>
          </div>
        </div>
      );
    }

    if (result.skipped) {
      const isApiError = result.reason === 'api_error';
      return (
        <>
          <div id="status-card" className="status-card status-skipped">
            <div className="status-icon">ℹ️</div>
            <div className="status-text">
              <h2>{isApiError ? "Sem verificação" : "URL não verificável"}</h2>
              <p id="current-url">{url}</p>
            </div>
          </div>
          <div className="details">
            <div className="api-row">
              <div>
                <div className="api-name">Google Safe Browsing</div>
                <div className="api-sub">{isApiError ? (result.google?.error || "Sem resposta") : "Apenas http/https são verificados"}</div>
              </div>
              <span className={`badge ${isApiError ? "badge-error" : "badge-loading"}`}>{isApiError ? "Erro" : "Ignorado"}</span>
            </div>
            <div className="api-row">
              <div>
                <div className="api-name">VirusTotal</div>
                <div className="api-sub">{isApiError ? (result.virustotal?.error || "Sem resposta") : "—"}</div>
              </div>
              <span className={`badge ${isApiError ? "badge-error" : "badge-loading"}`}>{isApiError ? "Erro" : "Ignorado"}</span>
            </div>
          </div>
        </>
      );
    }

    const { google, virustotal, safe } = result;

    let reputation = 'safe';
    let statusIcon = '✅';
    let statusTitle = 'URL Segura';
    
    if (!safe) {
      const vtMalicious = virustotal?.maliciousCount || 0;
      const googleUnsafe = !google?.error && !google?.safe;
      
      if (googleUnsafe || vtMalicious > 2) {
        reputation = 'danger';
        statusIcon = '🚨';
        statusTitle = 'Site Perigoso!';
      } else if (vtMalicious > 0 && vtMalicious <= 2) {
        reputation = 'warning';
        statusIcon = '⚠️';
        statusTitle = 'Site Pouco Seguro';
      } else {
        reputation = 'danger';
        statusIcon = '🚨';
        statusTitle = 'Possivelmente inseguro';
      }
    } else if (google?.error || virustotal?.error) {
      statusTitle = 'Verificação Incompleta';
      statusIcon = '⚠️';
      reputation = 'warning';
    }

    return (
      <>
        <div id="status-card" className={`status-card status-${reputation}`}>
          <div className="status-icon">{statusIcon}</div>
          <div className="status-text">
            <h2>{statusTitle}</h2>
            <p id="current-url">{url}</p>
          </div>
        </div>

        <div className="details">
          {/* Google Safe Browsing */}
          <div className="api-row">
            <div>
              <div className="api-name">Google Safe Browsing</div>
              <div className="api-sub">
                {google?.error ? google.error :
                 google?.safe ? "Nenhuma ameaça detectada" :
                 (google?.threats?.map((t: any) => t.type.replace(/_/g, " ")).join(", ") || "Ameaça detectada")}
              </div>
            </div>
            <span className={`badge ${google?.error ? 'badge-error' : google?.safe ? 'badge-safe' : 'badge-danger'}`}>
              {google?.error ? 'Erro' : google?.safe ? 'Seguro' : 'Perigo!'}
            </span>
          </div>

          {/* VirusTotal */}
          <div className="api-row">
            <div>
              <div className="api-name">VirusTotal</div>
              <div className="api-sub">
                {virustotal?.error ? virustotal.error :
                 virustotal?.safe && virustotal.totalEngines ? `0/${virustotal.totalEngines} engines detectaram ameaça` :
                 virustotal?.safe ? "Nenhuma ameaça" :
                 `${virustotal?.maliciousCount}/${virustotal?.totalEngines} engines detectaram ameaça`}
              </div>
            </div>
            <span className={`badge ${virustotal?.error ? 'badge-error' : virustotal?.safe ? 'badge-safe' : (virustotal?.maliciousCount > 0 && virustotal?.maliciousCount <= 2 ? 'badge-warning' : 'badge-danger')}`}>
              {virustotal?.error ? 'Erro' : virustotal?.safe ? 'Seguro' : (virustotal?.maliciousCount > 0 && virustotal?.maliciousCount <= 2 ? 'Suspeito' : 'Perigo!')}
            </span>
          </div>
        </div>

        {virustotal?.permalink && (
          <a id="vt-link" className="vt-link" href={virustotal.permalink} target="_blank" rel="noreferrer">
            🔗 Ver relatório completo no VirusTotal
          </a>
        )}

        <button className="check-btn" onClick={checkTab}>
          🔄 Verificar novamente
        </button>
      </>
    );
  };

  return (
    <>
      <header>
        <div className="logo">🛡️</div>
        <div>
          <h1>Zero Phishing</h1>
          <p>Proteção contra URLs maliciosas</p>
        </div>
      </header>
      
      {renderContent()}

      <footer>Zero Phishing · IFMT-CBA</footer>
    </>
  );
}
