import { useState, useEffect } from 'react';
import {
  getUrlRules,
  addUrlRule,
  deleteUrlRule,
  getFamily,
  createFamily,
  getFamilyInvitations,
  inviteFamilyMember,
  respondFamilyInvitation,
  cancelFamilyInvitation,
  updateFamilyMemberRole,
  removeFamilyMember,
  getFamilyNotifications,
  markFamilyNotificationRead,
  addFamilyUrlRule,
  deleteFamilyUrlRule,
  Family,
  FamilyInvitation,
  FamilyNotification,
  UrlRule,
} from '../../services/api';
import { getSavedUser, login, register, logout, AuthState } from '../../services/auth';
import {
  Bell,
  Check,
  CheckCircle,
  Crown,
  Globe,
  LogOut,
  Mail,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

type Tab = 'rules' | 'family' | 'login' | 'register';
type RuleType = 'whitelist' | 'blacklist';
type Feedback = { type: 'success' | 'error'; message: string } | null;

export default function App() {
  const [rules, setRules] = useState<UrlRule[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [family, setFamily] = useState<Family | null>(null);
  const [sentInvitations, setSentInvitations] = useState<FamilyInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<FamilyInvitation[]>([]);
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [newWhitelist, setNewWhitelist] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [tab, setTab] = useState<Tab>('rules');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const authState = await getSavedUser();
    setAuth(authState);
    setRules(await getUrlRules());

    if (!authState.isAuthenticated) {
      setFamily(null);
      setSentInvitations([]);
      setReceivedInvitations([]);
      setNotifications([]);
      return;
    }

    const [familyData, invitationData, notificationData] = await Promise.all([
      getFamily(),
      getFamilyInvitations(),
      getFamilyNotifications(),
    ]);
    setFamily(familyData);
    setSentInvitations(invitationData.sent);
    setReceivedInvitations(invitationData.received);
    setNotifications(notificationData);
  }

  async function handleAddRule(domain: string, type: RuleType) {
    if (!domain.trim()) return;
    await addUrlRule(domain.trim(), type);
    if (type === 'whitelist') setNewWhitelist('');
    else setNewBlacklist('');
    await loadData();
  }

  async function handleDelete(rule: UrlRule) {
    await deleteUrlRule(rule);
    await loadData();
  }

  const personalRules = rules.filter(rule => rule.source !== 'family');
  const whitelist = personalRules.filter(rule => rule.rule_type === 'whitelist');
  const blacklist = personalRules.filter(rule => rule.rule_type === 'blacklist');

  return (
    <div className="options-container">
      <header>
        <h1>
          <Shield size={32} color="#3b82f6" />
          Configurações - Zero Phishing
        </h1>
        {auth.isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
              <UserIcon size={20} />
              <span>{auth.user?.first_name || auth.user?.username}</span>
            </div>
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => { await logout(); await loadData(); setTab('rules'); }}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tab !== 'login' && <button className="btn-primary" onClick={() => setTab('login')}>Entrar</button>}
            {tab !== 'register' && <button className="btn-primary" style={{ background: '#64748b' }} onClick={() => setTab('register')}>Criar Conta</button>}
            {tab !== 'rules' && <button className="btn-primary" style={{ background: '#cbd5e1', color: '#1e293b' }} onClick={() => setTab('rules')}>Regras Locais</button>}
          </div>
        )}
      </header>

      {auth.isAuthenticated && (
        <div className="tabs">
          <button className={tab === 'rules' ? 'tab-active' : ''} onClick={() => setTab('rules')}>
            <Shield size={16} /> Regras
          </button>
          <button className={tab === 'family' ? 'tab-active' : ''} onClick={() => setTab('family')}>
            <Users size={16} /> Família
          </button>
        </div>
      )}

      {tab === 'login' && !auth.isAuthenticated && (
        <LoginForm onLogin={async () => { await loadData(); setTab('rules'); }} onSwitch={() => setTab('register')} />
      )}

      {tab === 'register' && !auth.isAuthenticated && (
        <RegisterForm onRegister={async () => { await loadData(); setTab('rules'); }} onSwitch={() => setTab('login')} />
      )}

      {tab === 'family' && auth.isAuthenticated && (
        <FamilyPanel
          family={family}
          sentInvitations={sentInvitations}
          receivedInvitations={receivedInvitations}
          notifications={notifications}
          currentUserId={auth.user?.id}
          onRefresh={loadData}
        />
      )}

      {(tab === 'rules' || !auth.isAuthenticated) && (
        <>
          <div className="auth-status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={24} color={auth.isAuthenticated ? '#10b981' : '#64748b'} />
              <div>
                <strong style={{ display: 'block' }}>Status de Sincronização</strong>
                {auth.isAuthenticated
                  ? <span style={{ color: '#10b981' }}>Regras salvas na nuvem</span>
                  : <span style={{ color: '#64748b' }}>Modo offline</span>}
              </div>
            </div>
          </div>

          <div className="rule-grid">
            <RuleColumn
              title="Permissões"
              icon={<CheckCircle size={24} />}
              color="#16a34a"
              value={newWhitelist}
              placeholder="*.siteconfiavel.com"
              rules={whitelist}
              onChange={setNewWhitelist}
              onAdd={() => handleAddRule(newWhitelist, 'whitelist')}
              onDelete={handleDelete}
            />
            <RuleColumn
              title="Bloqueios"
              icon={<ShieldAlert size={24} />}
              color="#dc2626"
              value={newBlacklist}
              placeholder="*.siteperigoso.com"
              rules={blacklist}
              onChange={setNewBlacklist}
              onAdd={() => handleAddRule(newBlacklist, 'blacklist')}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RuleColumn({
  title,
  icon,
  color,
  value,
  placeholder,
  rules,
  onChange,
  onAdd,
  onDelete,
  readOnly = false,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  value: string;
  placeholder: string;
  rules: UrlRule[];
  onChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (rule: UrlRule) => void;
  readOnly?: boolean;
}) {
  return (
    <section style={{ flex: 1 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
        {icon} {title}
      </h2>
      {!readOnly && (
        <div className="rule-form">
          <input
            type="text"
            className="rule-input"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="button" className="btn-primary" style={{ background: color }} onClick={onAdd}>
            <Plus size={18} />
          </button>
        </div>
      )}
      <ul className="rule-list">
        {rules.map(rule => (
          <li key={`${rule.source || 'personal'}_${rule.id}`} className="rule-item" style={{ borderLeft: `4px solid ${color}` }}>
            <div>
              <strong>{rule.url_pattern}</strong>
              <span className="rule-source">{rule.source === 'family' ? 'Família' : rule.source === 'local' ? 'Local' : 'Pessoal'}</span>
            </div>
            {!readOnly && rule.source !== 'family' && (
              <button className="btn-danger" style={{ background: '#fee2e2', color: '#dc2626' }} onClick={() => onDelete(rule)}>
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
        {rules.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma regra configurada.</p>}
      </ul>
    </section>
  );
}

function FamilyPanel({
  family,
  sentInvitations,
  receivedInvitations,
  notifications,
  currentUserId,
  onRefresh,
}: {
  family: Family | null;
  sentInvitations: FamilyInvitation[];
  receivedInvitations: FamilyInvitation[];
  notifications: FamilyNotification[];
  currentUserId?: number;
  onRefresh: () => Promise<void>;
}) {
  const [familyName, setFamilyName] = useState('');
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [newWhitelist, setNewWhitelist] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [error, setError] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);
  const isAdmin = family?.current_user_role === 'admin';

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError('');
    try {
      await action();
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar a solicitação.');
    } finally {
      setLoading(false);
    }
  }

  async function addFamilyRule(domain: string, type: RuleType) {
    if (!domain.trim()) return;
    await run(async () => {
      await addFamilyUrlRule(domain.trim(), type);
      if (type === 'whitelist') setNewWhitelist('');
      else setNewBlacklist('');
    });
  }

  function displayName(firstName: string, lastName: string, username: string) {
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || username;
  }

  async function sendInvite() {
    const identifier = inviteIdentifier.trim();
    if (!identifier) return;

    setLoading(true);
    setError('');
    setInviteFeedback(null);
    try {
      const invitation = await inviteFamilyMember(identifier);
      const name = displayName(
        invitation.invited_user_first_name,
        invitation.invited_user_last_name,
        invitation.invited_user_username,
      );
      setInviteIdentifier('');
      setInviteFeedback({
        type: 'success',
        message: `Convite enviado para ${name} (@${invitation.invited_user_username}).`,
      });
      await onRefresh();
    } catch (err: unknown) {
      setInviteFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível enviar o convite.',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!family) {
    return (
      <section className="family-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={22} /> Família
        </h2>
        {receivedInvitations.length > 0 && (
          <InvitationInbox invitations={receivedInvitations} loading={loading} onRun={run} />
        )}
        <div className="family-form">
          <input className="rule-input" placeholder="Nome da família" value={familyName} onChange={event => setFamilyName(event.target.value)} />
          <button className="btn-primary" disabled={loading || !familyName.trim()} onClick={() => run(async () => {
            await createFamily(familyName.trim());
            setFamilyName('');
          })}>
            <Plus size={18} /> Criar
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }

  const familyWhitelist = family.rules.filter(rule => rule.rule_type === 'whitelist');
  const familyBlacklist = family.rules.filter(rule => rule.rule_type === 'blacklist');

  return (
    <section className="family-section">
      <div className="family-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} /> {family.name}
          </h2>
          <span className="role-pill">{isAdmin ? 'Administrador' : 'Membro'}</span>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {notifications.length > 0 && (
        <div className="family-block">
          <h3><Bell size={18} /> Notificações</h3>
          <ul className="compact-list">
            {notifications.map(notification => (
              <li key={notification.id} className={notification.is_read ? 'muted-row' : ''}>
                <span>{notification.message}</span>
                {!notification.is_read && (
                  <button className="icon-button" title="Marcar como lida" onClick={() => run(async () => { await markFamilyNotificationRead(notification.id); })}>
                    <Check size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {receivedInvitations.length > 0 && (
        <InvitationInbox invitations={receivedInvitations} loading={loading} onRun={run} />
      )}

      <div className="family-block">
        <h3><UserIcon size={18} /> Membros</h3>
        <ul className="compact-list">
          {family.members.map(member => (
            <li key={member.id}>
              <span>
                <strong>
                  {displayName(member.first_name, member.last_name, member.username)}
                  <span className="username-inline">@{member.username}</span>
                </strong>
                <span className="secondary-text">{member.email}</span>
              </span>
              <span className="member-actions">
                {member.role === 'admin' && <Crown size={16} color="#facc15" />}
                {isAdmin && member.user !== currentUserId && (
                  <>
                    <button
                      className="btn-secondary"
                      disabled={loading}
                      onClick={() => run(async () => { await updateFamilyMemberRole(member.id, member.role === 'admin' ? 'member' : 'admin'); })}
                    >
                      {member.role === 'admin' ? 'Membro' : 'Admin'}
                    </button>
                    <button className="btn-danger" disabled={loading} onClick={() => run(async () => { await removeFamilyMember(member.id); })}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && (
        <div className="family-block">
          <h3><UserPlus size={18} /> Convites</h3>
          <div className="family-form">
            <input
              className="rule-input"
              placeholder="Email ou usuário"
              value={inviteIdentifier}
              onChange={event => {
                setInviteIdentifier(event.target.value);
                if (inviteFeedback) setInviteFeedback(null);
              }}
            />
            <button
              className={`btn-primary ${inviteFeedback?.type === 'error' ? 'btn-warning' : ''}`}
              disabled={loading || !inviteIdentifier.trim()}
              onClick={sendInvite}
            >
              <Mail size={18} /> Enviar
            </button>
          </div>
          {inviteFeedback && (
            <p className={inviteFeedback.type === 'error' ? 'form-warning' : 'form-success'}>
              {inviteFeedback.message}
            </p>
          )}
          {sentInvitations.length > 0 && (
            <ul className="compact-list">
              {sentInvitations.map(invitation => (
                <li key={invitation.id}>
                  <span>
                    <strong>
                      {displayName(invitation.invited_user_first_name, invitation.invited_user_last_name, invitation.invited_user_username)}
                      <span className="username-inline">@{invitation.invited_user_username}</span>
                    </strong>
                    <span className="secondary-text">{invitation.email} · {invitation.status}</span>
                  </span>
                  {invitation.status === 'pending' && (
                    <button className="icon-button" title="Cancelar convite" onClick={() => run(async () => { await cancelFamilyInvitation(invitation.id); })}>
                      <X size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="family-block">
        <h3><Shield size={18} /> Regras da Família</h3>
        <div className="rule-grid">
          <RuleColumn
            title="Permissões"
            icon={<CheckCircle size={24} />}
            color="#16a34a"
            value={newWhitelist}
            placeholder="*.siteconfiavel.com"
            rules={familyWhitelist}
            onChange={setNewWhitelist}
            onAdd={() => addFamilyRule(newWhitelist, 'whitelist')}
            onDelete={(rule) => run(async () => { await deleteFamilyUrlRule(Number(rule.id)); })}
            readOnly={!isAdmin}
          />
          <RuleColumn
            title="Bloqueios"
            icon={<ShieldAlert size={24} />}
            color="#dc2626"
            value={newBlacklist}
            placeholder="*.siteperigoso.com"
            rules={familyBlacklist}
            onChange={setNewBlacklist}
            onAdd={() => addFamilyRule(newBlacklist, 'blacklist')}
            onDelete={(rule) => run(async () => { await deleteFamilyUrlRule(Number(rule.id)); })}
            readOnly={!isAdmin}
          />
        </div>
      </div>
    </section>
  );
}

function InvitationInbox({
  invitations,
  loading,
  onRun,
}: {
  invitations: FamilyInvitation[];
  loading: boolean;
  onRun: (action: () => Promise<void>) => Promise<void>;
}) {
  return (
    <div className="family-block">
      <h3><Mail size={18} /> Convites Recebidos</h3>
      <ul className="compact-list">
        {invitations.map(invitation => (
          <li key={invitation.id}>
            <span>
              <strong>{invitation.family_name}</strong>
              <span className="secondary-text">
                por {formatInvitationUser(invitation.invited_by_first_name, invitation.invited_by_last_name, invitation.invited_by_username)}
              </span>
            </span>
            <span className="member-actions">
              <button className="btn-secondary" disabled={loading} onClick={() => onRun(async () => { await respondFamilyInvitation(invitation.id, 'accept'); })}>
                <Check size={16} /> Aceitar
              </button>
              <button className="btn-danger" disabled={loading} onClick={() => onRun(async () => { await respondFamilyInvitation(invitation.id, 'decline'); })}>
                <X size={16} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatInvitationUser(firstName: string, lastName: string, username: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return `${fullName || username} (@${username})`;
}

function LoginForm({ onLogin, onSwitch }: { onLogin: () => void, onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
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
    <div className="auth-card">
      <h2>Entrar no Zero Phishing</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="rule-input" type="text" placeholder="Usuário" value={username} onChange={event => setUsername(event.target.value)} required />
        <input className="rule-input" type="password" placeholder="Senha" value={password} onChange={event => setPassword(event.target.value)} required />
        {error && <p className="form-error">{error}</p>}
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
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
    <div className="auth-card">
      <h2>Criar nova conta</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="rule-input" type="text" placeholder="Nome" value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} required />
        <input className="rule-input" type="text" placeholder="Nome de Usuário" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} required />
        <input className="rule-input" type="email" placeholder="Email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
        <input className="rule-input" type="password" placeholder="Senha" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Criar e Entrar'}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>Já tem uma conta? <a href="#" onClick={onSwitch} style={{ color: '#3b82f6' }}>Entrar</a></p>
    </div>
  );
}
