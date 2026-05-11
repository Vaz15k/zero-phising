import { useState, useEffect } from 'react';
import { getSavedUser, login, pinLogin, register, updateProfile, logout, User, AuthState } from '../../services/auth';
import { PopupPage } from '../../types';
import './style.css';

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<PopupPage>('main');

  useEffect(() => {
    getSavedUser().then((state) => {
      setAuth(state);
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return (
      <div className="container">
        <div id="status-card" className="status-card status-loading">
          <div className="status-icon">⏳</div>
          <div className="status-text"><h2>Carregando...</h2></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header user={auth.user} isAuthenticated={auth.isAuthenticated} onLogout={() => { logout().then(() => { setAuth({ user: null, isAuthenticated: false }); }); }} onNavigate={setPage} currentPage={page} />

      {page === 'main' && <UrlChecker />}
      {page === 'login' && <LoginPage onLogin={(s) => { setAuth(s); setPage('main'); }} onRegister={() => setPage('register')} onPinLogin={(s) => { setAuth(s); setPage('main'); }} onSkip={() => setPage('main')} />}
      {page === 'register' && <RegisterPage onRegister={(s) => { setAuth(s); setPage('main'); }} onBack={() => setPage('login')} />}
      {page === 'profile' && <ProfilePage user={auth.user!} onUpdate={(u) => setAuth({ user: u, isAuthenticated: true })} onBack={() => setPage('main')} />}

      <footer>Zero Phishing · IFMT-CBA</footer>
    </>
  );
}

function Header({ user, isAuthenticated, onLogout, onNavigate, currentPage }: { user: User | null; isAuthenticated: boolean; onLogout: () => void; onNavigate: (p: PopupPage) => void; currentPage: PopupPage }) {
  if (currentPage !== 'main') return null;
  return (
    <header>
      <div className="logo">🛡️</div>
      <div>
        <h1>Zero Phishing</h1>
        {isAuthenticated ? (
          <p>Bem-vindo, {user?.first_name || user?.username}</p>
        ) : (
          <p className="header-subtle">Nao logado · <button className="link-inline" onClick={() => onNavigate('login')}>Entrar</button></p>
        )}
      </div>
      {isAuthenticated && (
        <div className="header-menu">
          <button className="icon-btn" onClick={() => onNavigate('profile')} title="Perfil">👤</button>
          <button className="icon-btn" onClick={onLogout} title="Sair">🚪</button>
        </div>
      )}
    </header>
  );
}

function LoginPage({ onLogin, onRegister, onPinLogin, onSkip }: { onLogin: (s: AuthState) => void; onRegister: () => void; onPinLogin: (s: AuthState) => void; onSkip: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (usePin) {
        const state = await pinLogin(username, pin);
        onPinLogin(state);
      } else {
        const state = await login(username, password);
        onLogin(state);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <div className="auth-logo">🛡️</div>
        <h2>Zero Phishing</h2>
        <p className="auth-sub">Faça login para acessar as configurações</p>

        <form onSubmit={handleSubmit}>
          <input className="auth-input" type="text" placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} required />

          {usePin ? (
            <input className="auth-input" type="password" placeholder="PIN" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} required />
          ) : (
            <input className="auth-input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : (usePin ? 'Entrar com PIN' : 'Entrar')}
          </button>
        </form>

        <div className="auth-links">
          <button className="link-btn" onClick={() => setUsePin(!usePin)}>
            {usePin ? 'Usar senha' : 'Usar PIN'}
          </button>
          <button className="link-btn" onClick={onRegister}>
            Criar conta
          </button>
          <button className="link-btn" onClick={onSkip}>
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ onRegister, onBack }: { onRegister: (s: AuthState) => void; onBack: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const state = await register(form.username, form.email, form.password, form.first_name, form.last_name);
      onRegister(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <div className="auth-logo">🛡️</div>
        <h2>Criar Conta</h2>

        <form onSubmit={handleSubmit}>
          <input className="auth-input" type="text" placeholder="Nome de usuário *" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className="auth-input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="auth-input" type="text" placeholder="Nome" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input className="auth-input" type="text" placeholder="Sobrenome" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input className="auth-input" type="password" placeholder="Senha *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className="auth-input" type="password" placeholder="Confirmar senha *" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <button className="link-btn" onClick={onBack}>Voltar ao login</button>
      </div>
    </div>
  );
}

function ProfilePage({ user, onUpdate, onBack }: { user: User; onUpdate: (u: User) => void; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email, pin: user.pin || '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updated = await updateProfile(form);
      onUpdate(updated);
      setSuccess('Perfil atualizado!');
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <div className="container">
        <div className="profile-top-bar">
          <button className="icon-btn" onClick={onBack}>← Voltar</button>
        </div>
        <div className="profile-card">
          <div className="profile-avatar">👤</div>
          <h2>{user.first_name || user.username}</h2>
          <div className="profile-info">
            <div className="profile-row"><span>Usuário</span><span>{user.username}</span></div>
            <div className="profile-row"><span>Email</span><span>{user.email}</span></div>
            <div className="profile-row"><span>Nome</span><span>{user.first_name} {user.last_name}</span></div>
            <div className="profile-row"><span>PIN</span><span>{user.pin ? '••••••' : 'Não definido'}</span></div>
            <div className="profile-row"><span>Membro desde</span><span>{new Date(user.date_joined).toLocaleDateString('pt-BR')}</span></div>
            <div className="profile-row"><span>Último login</span><span>{user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : '—'}</span></div>
          </div>
          <button className="auth-btn" onClick={() => setEditing(true)}>Editar Perfil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="profile-top-bar">
        <button className="icon-btn" onClick={onBack}>← Voltar</button>
      </div>
      <div className="auth-card">
        <h2>Editar Perfil</h2>
        <form onSubmit={handleSave}>
          <input className="auth-input" type="text" placeholder="Nome" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input className="auth-input" type="text" placeholder="Sobrenome" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input className="auth-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="auth-input" type="password" placeholder="PIN (4-6 dígitos)" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          <button className="link-btn" type="button" onClick={() => setEditing(false)}>Cancelar</button>
        </form>
      </div>
    </div>
  );
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
