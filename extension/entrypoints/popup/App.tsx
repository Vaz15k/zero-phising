import { useState, useEffect } from 'react';
import { getSavedUser, logout, User, AuthState } from '../../services/auth';
import { checkBreaches, Breach } from '../../services/breach';
import { PopupPage } from '../../types';
import { Shield, CheckCircle, LogOut, Settings, Loader2, ArrowLeft, Search, UserCircle, Bell } from 'lucide-react';
import { getFamilyNotifications, FamilyNotification, markFamilyNotificationRead } from '../../services/api';
import './style.css';

function openOptionsPage(isAuthenticated: boolean) {
  const url = browser.runtime.getURL('/options.html') + (isAuthenticated ? '' : '?tab=login');
  browser.tabs.create({ url });
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<PopupPage>('main');
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);

  useEffect(() => {
    getSavedUser().then((state) => {
      setAuth(state);
      setAuthLoading(false);
      if (state.isAuthenticated) {
        getFamilyNotifications().then(setNotifications).catch(() => {});
      }
    });
  }, []);

  if (authLoading) {
    return (
      <div className="container">
        <div id="status-card" className="status-card status-loading">
          <div className="status-icon"><Loader2 className="animate-spin" size={32} /></div>
          <div className="status-text"><h2>Carregando...</h2></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        user={auth.user} 
        isAuthenticated={auth.isAuthenticated} 
        onLogout={() => { logout().then(() => { setAuth({ user: null, isAuthenticated: false }); }); }} 
        onNavigate={setPage} 
        currentPage={page}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      {page === 'main' && <MainPage />}
      {page === 'breaches' && <BreachCheckerPage onBack={() => setPage('main')} />}

      <footer>Zero Phishing · IFMT-CBA</footer>
    </>
  );
}

function Header({ 
  user, isAuthenticated, onLogout, onNavigate, currentPage, notifications = [], setNotifications 
}: { 
  user: User | null; isAuthenticated: boolean; onLogout: () => void; onNavigate: (p: PopupPage) => void; currentPage: PopupPage; notifications?: FamilyNotification[]; setNotifications?: React.Dispatch<React.SetStateAction<FamilyNotification[]>> 
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowNotifications(false);
    }
  }, [isAuthenticated]);

  if (currentPage !== 'main') return null;

  const handleNotificationClick = async (n: FamilyNotification) => {
    if (!n.is_read && setNotifications) {
      await markFamilyNotificationRead(n.id);
      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
    }
  };

  return (
    <header>
      <div className="logo"><Shield size={24} color="#3b82f6" /></div>
      <div>
        <h1>Zero Phishing</h1>
        {isAuthenticated ? (
          <p>Bem-vindo, {user?.first_name || user?.username}</p>
        ) : (
          <p className="header-subtle">Não conectado</p>
        )}
      </div>
      <div className="header-menu">
        {!isAuthenticated && (
          <button className="icon-btn" onClick={() => openOptionsPage(false)} title="Entrar na conta">
            <UserCircle size={18} />
          </button>
        )}
        {isAuthenticated && (
          <div style={{ position: 'relative' }}>
            <button 
              className="icon-btn" 
              onClick={() => setShowNotifications(!showNotifications)} 
              title="Notificações"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="notification-badge">{notifications.filter(n => !n.is_read).length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="notifications-header">Notificações</div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <p className="notifications-empty">Nenhuma notificação</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleNotificationClick(n)}>
                        <p>{n.message}</p>
                        <small>{new Date(n.created_at).toLocaleString('pt-BR')}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {isAuthenticated && (
          <button className="icon-btn" onClick={onLogout} title="Sair"><LogOut size={18} /></button>
        )}
        <button className="icon-btn" onClick={() => openOptionsPage(isAuthenticated)} title="Configurações"><Settings size={18} /></button>
      </div>
    </header>
  );
}

function MainPage() {
  return <UrlChecker />;
}

function UrlChecker() {
  const [url, setUrl] = useState<string>('Obtendo URL atual...');
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<unknown>(null);

  const checkTab = async () => {
    setLoading(true);
    setResult(null);
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      if (currentTab?.url) {
        setUrl(currentTab.url.length > 45 ? currentTab.url.slice(0, 42) + '...' : currentTab.url);
        browser.runtime.sendMessage(
          { type: 'CHECK_URL', url: currentTab.url },
          (response) => {
            setResult(response);
            setLoading(false);
          },
        );
      } else {
        setUrl('URL não disponível');
        setLoading(false);
      }
    } catch {
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

    const r = result as Record<string, unknown>;

    if (r.skipped) {
      const isApiError = (r as { reason?: string }).reason === 'api_error';
      const google = r.google as Record<string, unknown> | undefined;
      const virustotal = r.virustotal as Record<string, unknown> | undefined;
      return (
        <>
          <div id="status-card" className="status-card status-skipped">
            <div className="status-icon">ℹ️</div>
            <div className="status-text">
              <h2>{isApiError ? 'Sem verificação' : 'URL não verificável'}</h2>
              <p id="current-url">{url}</p>
            </div>
          </div>
          <div className="details">
            <div className="api-row">
              <div>
                <div className="api-name">Google Safe Browsing</div>
                <div className="api-sub">{isApiError ? (google?.error as string || 'Sem resposta') : 'Apenas http/https são verificados'}</div>
              </div>
              <span className={`badge ${isApiError ? 'badge-error' : 'badge-loading'}`}>{isApiError ? 'Erro' : 'Ignorado'}</span>
            </div>
            <div className="api-row">
              <div>
                <div className="api-name">VirusTotal</div>
                <div className="api-sub">{isApiError ? (virustotal?.error as string || 'Sem resposta') : '—'}</div>
              </div>
              <span className={`badge ${isApiError ? 'badge-error' : 'badge-loading'}`}>{isApiError ? 'Erro' : 'Ignorado'}</span>
            </div>
          </div>
        </>
      );
    }

    const google = r.google as Record<string, unknown> | undefined;
    const virustotal = r.virustotal as Record<string, unknown> | undefined;
    const safe = r.safe as boolean;

    let reputation = 'safe';
    let statusIcon = '✅';
    let statusTitle = 'URL Segura';

    if (!safe) {
      const vtMalicious = (virustotal?.maliciousCount as number) || 0;
      const googleUnsafe = !(google as { error?: string; safe?: boolean })?.error && !(google as { safe?: boolean })?.safe;

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
    } else if ((google as { error?: string })?.error || (virustotal as { error?: string })?.error) {
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
          <div className="api-row">
            <div>
              <div className="api-name">Google Safe Browsing</div>
              <div className="api-sub">
                {(google as { error?: string })?.error ? (google as { error: string }).error :
                 (google as { safe?: boolean })?.safe ? 'Nenhuma ameaça detectada' :
                 ((google as { threats?: Array<{ type: string }> })?.threats?.map((t) => t.type.replace(/_/g, ' ')).join(', ') || 'Ameaça detectada')}
              </div>
            </div>
            <span className={`badge ${(google as { error?: string })?.error ? 'badge-error' : (google as { safe?: boolean })?.safe ? 'badge-safe' : 'badge-danger'}`}>
              {(google as { error?: string })?.error ? 'Erro' : (google as { safe?: boolean })?.safe ? 'Seguro' : 'Perigo!'}
            </span>
          </div>

          <div className="api-row">
            <div>
              <div className="api-name">VirusTotal</div>
              <div className="api-sub">
                {(virustotal as { error?: string })?.error ? (virustotal as { error: string }).error :
                 (virustotal as { safe?: boolean; totalEngines?: number })?.safe && (virustotal as { totalEngines?: number })?.totalEngines ? `0/${(virustotal as { totalEngines: number }).totalEngines} engines detectaram ameaça` :
                 (virustotal as { safe?: boolean })?.safe ? 'Nenhuma ameaça' :
                 `${(virustotal as { maliciousCount?: number })?.maliciousCount || 0}/${(virustotal as { totalEngines?: number })?.totalEngines || 0} engines detectaram ameaça`}
              </div>
            </div>
            <span className={`badge ${(virustotal as { error?: string })?.error ? 'badge-error' : (virustotal as { safe?: boolean })?.safe ? 'badge-safe' : ((virustotal as { maliciousCount?: number })?.maliciousCount || 0) > 0 && ((virustotal as { maliciousCount?: number })?.maliciousCount || 0) <= 2 ? 'badge-warning' : 'badge-danger'}`}>
              {(virustotal as { error?: string })?.error ? 'Erro' : (virustotal as { safe?: boolean })?.safe ? 'Seguro' : ((virustotal as { maliciousCount?: number })?.maliciousCount || 0) > 0 && ((virustotal as { maliciousCount?: number })?.maliciousCount || 0) <= 2 ? 'Suspeito' : 'Perigo!'}
            </span>
          </div>
        </div>

        {(virustotal as { permalink?: string })?.permalink && (
          <a className="vt-link" href={(virustotal as { permalink: string }).permalink} target="_blank" rel="noreferrer">
            🔗 Ver relatório completo no VirusTotal
          </a>
        )}

        <button className="check-btn" onClick={checkTab}>
          🔄 Verificar novamente
        </button>
      </>
    );
  };

  return <div className="container">{renderContent()}</div>;
}

function BreachCheckerPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [breaches, setBreaches] = useState<Breach[] | null>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Por favor, insira um formato de e-mail válido.');
      return;
    }

    setLoading(true);
    setBreaches(null);

    try {
      const data = await checkBreaches(email);
      setBreaches(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="profile-top-bar">
        <button className="icon-btn" onClick={onBack} title="Voltar"><ArrowLeft size={18} /></button>
      </div>
      <div className="auth-card">
        <div className="auth-logo"><Search size={48} color="#3b82f6" /></div>
        <h2>Vazamento de Dados</h2>
        <p className="auth-sub">Verifique se seu e-mail foi exposto em vazamentos</p>

        <form onSubmit={handleCheck}>
          <input
            className="auth-input"
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar E-mail'}
          </button>
        </form>

        {breaches !== null && (
          <div className="breach-results">
            {breaches.length === 0 ? (
              <div className="status-card status-safe">
                <div className="status-icon"><CheckCircle size={28} color="#4ade80" /></div>
                <div className="status-text">
                  <h3>Nenhum vazamento encontrado</h3>
                  <p>Este e-mail não foi encontrado em bancos de dados públicos de vazamentos.</p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="breach-title">
                  ⚠️ Encontrado em {breaches.length} vazamento{breaches.length > 1 ? 's' : ''}
                </h3>
                <div className="breach-list">
                  {breaches.map((b, index) => (
                    <div key={index} className="breach-item">
                      <div className="breach-name">{b.Name}</div>
                      <div className="breach-meta">
                        <span>📅 {b.BreachDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
