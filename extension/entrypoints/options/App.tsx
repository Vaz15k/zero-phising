import { useState, useEffect } from 'react';
import { getUrlRules, addUrlRule, deleteUrlRule, getBlockLists, activateBlockList, deactivateBlockList, BlockList } from '../../services/api';
import type { UrlRule } from '../../services/storage';
import { getSavedUser, login, register, logout, AuthState } from '../../services/auth';
import { Shield, ShieldAlert, CheckCircle, Trash2, Plus, LogOut, User as UserIcon, Globe, List, ToggleLeft, ToggleRight } from 'lucide-react';

export default function App() {
  const [rules, setRules] = useState<UrlRule[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [newWhitelist, setNewWhitelist] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [tab, setTab] = useState<'rules' | 'login' | 'register' | 'blocklists'>('rules');
  const [blockLists, setBlockLists] = useState<BlockList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const rulesData = await getUrlRules();
    setRules(rulesData || []);
    const authState = await getSavedUser();
    setAuth(authState);
    if (authState.isAuthenticated) {
      loadBlockLists();
    }
  }

  async function loadBlockLists() {
    setLoadingLists(true);
    const lists = await getBlockLists();
    setBlockLists(lists);
    setLoadingLists(false);
  }

  async function handleToggleBlockList(list: BlockList) {
    if (list.is_activated) {
      await deactivateBlockList(list.id);
    } else {
      await activateBlockList(list.id);
    }
    await loadBlockLists();
  }

  async function handleAddRule(domain: string, type: 'whitelist' | 'blacklist') {
    if (!domain) return;
    await addUrlRule(domain, type);
    if (type === 'whitelist') setNewWhitelist('');
    else setNewBlacklist('');
    await loadData();
  }

  async function handleDelete(rule: UrlRule) {
    await deleteUrlRule(rule);
    await loadData();
  }

  const whitelist = rules.filter(r => r.rule_type === 'whitelist');
  const blacklist = rules.filter(r => r.rule_type === 'blacklist');

  return (
    <div className="options-container">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={32} color="#3b82f6" />
          Configurações - Zero Phishing
        </h1>
        {auth.isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              <UserIcon size={20} />
              <span>{auth.user?.first_name || auth.user?.username}</span>
            </div>
            {tab !== 'blocklists' && <button className="btn-primary" style={{ background: '#8b5cf6' }} onClick={() => { setTab('blocklists'); loadBlockLists(); }}><List size={16} style={{ marginRight: '4px' }} />Listas Padrão</button>}
            {tab !== 'rules' && <button className="btn-primary" style={{ background: '#cbd5e1', color: '#1e293b' }} onClick={() => setTab('rules')}>Regras</button>}
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => { await logout(); setTab('rules'); await loadData(); }}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            {tab !== 'login' && <button className="btn-primary" onClick={() => setTab('login')}>Entrar</button>}
            {tab !== 'register' && <button className="btn-primary" style={{ background: '#64748b' }} onClick={() => setTab('register')}>Criar Conta</button>}
            {tab !== 'rules' && <button className="btn-primary" style={{ background: '#cbd5e1', color: '#1e293b' }} onClick={() => setTab('rules')}>Configurações Locais</button>}
          </div>
        )}
      </header>

      {tab === 'login' && !auth.isAuthenticated && (
        <LoginForm onLogin={async () => { await loadData(); setTab('rules'); }} onSwitch={() => setTab('register')} />
      )}
      
      {tab === 'register' && !auth.isAuthenticated && (
        <RegisterForm onRegister={async () => { await loadData(); setTab('rules'); }} onSwitch={() => setTab('login')} />
      )}

      {tab === 'blocklists' && auth.isAuthenticated && (
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', marginBottom: '10px' }}>
            <List size={24} color="#a78bfa" /> Listas de Bloqueio Padrão
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
            Ative listas pré-definidas de bloqueio por categoria. Os domínios destas listas serão bloqueados automaticamente.
          </p>
          {loadingLists ? (
            <p style={{ color: '#94a3b8' }}>Carregando listas...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {blockLists.map(list => (
                <div key={list.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  background: list.is_activated ? '#0f2818' : '#0f172a',
                  border: `1px solid ${list.is_activated ? '#166534' : '#334155'}`,
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '15px', color: '#e2e8f0' }}>{list.name}</strong>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: '10px',
                        background: list.is_activated ? '#166534' : '#1e293b',
                        color: list.is_activated ? '#4ade80' : '#64748b',
                        border: `1px solid ${list.is_activated ? '#22c55e44' : '#334155'}`,
                      }}>
                        {list.is_activated ? 'ATIVADO' : 'DESATIVADO'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#94a3b8' }}>{list.description}</p>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{list.domain_count.toLocaleString()} domínios</span>
                  </div>
                  <button
                    onClick={() => handleToggleBlockList(list)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: list.is_activated ? '#dc2626' : '#16a34a',
                      transition: 'all 0.15s ease',
                      minWidth: '130px',
                      justifyContent: 'center',
                    }}
                  >
                    {list.is_activated ? (
                      <><ToggleRight size={20} /> Desativar</>
                    ) : (
                      <><ToggleLeft size={20} /> Ativar</>
                    )}
                  </button>
                </div>
              ))}
              {blockLists.length === 0 && (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma lista disponível. Execute o comando seed no servidor.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <>
          <div className="auth-status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={24} color={auth.isAuthenticated ? "#10b981" : "#64748b"} />
              <div>
                <strong style={{ display: 'block' }}>Status de Sincronização</strong>
                {auth.isAuthenticated 
                  ? <span style={{ color: '#10b981' }}>Regras salvas na nuvem - Sincronizado</span>
                  : <span style={{ color: '#64748b' }}>Modo Offline - Regras salvas localmente neste navegador</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '30px' }}>
            {/* Whitelist Section */}
            <div style={{ flex: 1 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
                <CheckCircle size={24} /> Permissões (Whitelist)
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Sites listados aqui nunca serão bloqueados. Use <code>*.exemplo.com</code> para todos os subdomínios.</p>
              
              <div className="rule-form">
                <input 
                  type="text" 
                  className="rule-input"
                  placeholder="Ex: *.siteconfiavel.com" 
                  value={newWhitelist} 
                  onChange={(e) => setNewWhitelist(e.target.value)} 
                />
                <button type="button" className="btn-primary" style={{ background: '#16a34a' }} onClick={() => handleAddRule(newWhitelist, 'whitelist')}>
                  <Plus size={18} />
                </button>
              </div>

              <ul className="rule-list">
                {whitelist.map(rule => (
                  <li key={rule.id} className="rule-item" style={{ borderLeft: '4px solid #16a34a' }}>
                    <div>
                      <strong>{rule.url_pattern}</strong>
                      {typeof rule.id === 'string' && rule.id.startsWith('local_') && <span style={{ marginLeft: '5px', fontSize: '12px', color: '#64748b' }}>(Local)</span>}
                    </div>
                    <button className="btn-danger" style={{ background: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(rule)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {whitelist.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma permissão configurada.</p>}
              </ul>
            </div>

            {/* Blacklist Section */}
            <div style={{ flex: 1 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <ShieldAlert size={24} /> Bloqueios (Blacklist)
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Sites listados aqui serão bloqueados imediatamente. Use <code>*.exemplo.com</code> para subdomínios.</p>
              
              <div className="rule-form">
                <input 
                  type="text" 
                  className="rule-input"
                  placeholder="Ex: *.siteperigoso.com" 
                  value={newBlacklist} 
                  onChange={(e) => setNewBlacklist(e.target.value)} 
                />
                <button type="button" className="btn-primary" style={{ background: '#dc2626' }} onClick={() => handleAddRule(newBlacklist, 'blacklist')}>
                  <Plus size={18} />
                </button>
              </div>

              <ul className="rule-list">
                {blacklist.map(rule => (
                  <li key={rule.id} className="rule-item" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div>
                      <strong>{rule.url_pattern}</strong>
                      {typeof rule.id === 'string' && rule.id.startsWith('local_') && <span style={{ marginLeft: '5px', fontSize: '12px', color: '#64748b' }}>(Local)</span>}
                    </div>
                    <button className="btn-danger" style={{ background: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(rule)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {blacklist.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum bloqueio configurado.</p>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoginForm({ onLogin, onSwitch }: { onLogin: () => void, onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(username, password);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Entrar no Zero Phishing</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="rule-input" type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="rule-input" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Entrar'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>Não tem uma conta? <a href="#" onClick={onSwitch} style={{ color: '#3b82f6' }}>Criar conta</a></p>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitch }: { onRegister: () => void, onSwitch: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await register(form.username, form.email, form.password, form.first_name, '');
      onRegister();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Criar nova conta</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="rule-input" type="text" placeholder="Nome" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
        <input className="rule-input" type="text" placeholder="Nome de Usuário" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
        <input className="rule-input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        <input className="rule-input" type="password" placeholder="Senha" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
        {error && <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Criar e Entrar'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>Já tem uma conta? <a href="#" onClick={onSwitch} style={{ color: '#3b82f6' }}>Entrar</a></p>
    </div>
  );
}
