import { useState, useEffect, useRef } from 'react';
import {
  getUrlRules,
  addUrlRule,
  deleteUrlRule,
  getBlockLists,
  activateBlockList,
  deactivateBlockList,
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
  getBlockedHistory,
  getDashboardStats,
  Family,
  FamilyInvitation,
  FamilyNotification,
  BlockList,
  UrlRule,
  DashboardStats,
  DashboardPeriod,
  DashboardCategory,
} from '../../services/api';
import type { BlockedAccess } from '../../types';
import { getSavedUser, login, pinLogin, register, updateProfile, logout, AuthState, User } from '../../services/auth';
import {
  BarChart3,
  Bell,
  Check,
  CheckCircle,
  Crown,
  Globe,
  History,
  List,
  LogOut,
  Mail,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

type Tab = 'rules' | 'family' | 'blocklists' | 'history' | 'profile' | 'dashboard';
type RuleType = 'whitelist' | 'blacklist';
type Feedback = { type: 'success' | 'error'; message: string } | null;

function getInitialTab(): Tab {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'family' || tab === 'blocklists' || tab === 'history' || tab === 'profile' || tab === 'dashboard') {
    return tab;
  }
  return 'rules';
}

export default function App() {
  const [rules, setRules] = useState<UrlRule[]>([]);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [family, setFamily] = useState<Family | null>(null);
  const [sentInvitations, setSentInvitations] = useState<FamilyInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<FamilyInvitation[]>([]);
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [newWhitelist, setNewWhitelist] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [blockLists, setBlockLists] = useState<BlockList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [historyData, setHistoryData] = useState<BlockedAccess[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'mine' | 'family'>('mine');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('7d');
  const [dashboardFamilyView, setDashboardFamilyView] = useState(false);
  const dashboardRequestId = useRef(0);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab === 'login') setShowAuthModal('login');
    else if (urlTab === 'register') setShowAuthModal('register');
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
      setBlockLists([]);
      return;
    }

    const [familyData, invitationData, notificationData, blockListData] = await Promise.all([
      getFamily(),
      getFamilyInvitations(),
      getFamilyNotifications(),
      getBlockLists(),
    ]);
    setFamily(familyData);
    setSentInvitations(invitationData.sent);
    setReceivedInvitations(invitationData.received);
    setNotifications(notificationData);
    setBlockLists(blockListData);
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

  async function loadHistory(view: 'mine' | 'family' = 'mine') {
    setLoadingHistory(true);
    try {
      const data = await getBlockedHistory({ family: view === 'family' });
      setHistoryData(data);
    } catch (e) {
      console.error("Erro ao buscar histórico:", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadDashboard(period: DashboardPeriod = dashboardPeriod, family: boolean = dashboardFamilyView) {
    const requestId = ++dashboardRequestId.current;
    setLoadingDashboard(true);
    try {
      const data = await getDashboardStats({ period, family });
      if (requestId !== dashboardRequestId.current) return;
      setDashboardStats(data);
    } catch (e) {
      console.error('Erro ao buscar estatísticas do dashboard:', e);
    } finally {
      if (requestId === dashboardRequestId.current) setLoadingDashboard(false);
    }
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
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => { await logout(); setTab('rules'); await loadData(); }}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => setShowAuthModal('login')}>Entrar</button>
            <button className="btn-primary" style={{ background: '#64748b' }} onClick={() => setShowAuthModal('register')}>Criar Conta</button>
          </div>
        )}
      </header>

      {auth.isAuthenticated && (
        <div className="tabs">
          <button className={tab === 'profile' ? 'tab-active' : ''} onClick={() => setTab('profile')}>
            <UserIcon size={16} /> Perfil
          </button>
          <button className={tab === 'rules' ? 'tab-active' : ''} onClick={() => setTab('rules')}>
            <Shield size={16} /> Regras
          </button>
          <button className={tab === 'family' ? 'tab-active' : ''} onClick={() => setTab('family')}>
            <Users size={16} /> Família
          </button>
          <button className={tab === 'blocklists' ? 'tab-active' : ''} onClick={() => { setTab('blocklists'); loadBlockLists(); }}>
            <List size={16} /> Listas Padrão
          </button>
          <button className={tab === 'history' ? 'tab-active' : ''} onClick={() => { setTab('history'); setHistoryFilter('mine'); loadHistory('mine'); }}>
            <History size={16} /> Histórico
          </button>
          <button className={tab === 'dashboard' ? 'tab-active' : ''} onClick={() => { setTab('dashboard'); loadDashboard(dashboardPeriod, dashboardFamilyView); }}>
            <BarChart3 size={16} /> Dashboard
          </button>
        </div>
      )}



      {tab === 'history' && auth.isAuthenticated && (
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '10px' }}>
            <History size={24} color="#f59e0b" /> Histórico de Bloqueios
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
            Visualize as tentativas de acesso bloqueadas associadas à sua conta.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className="btn-primary" style={{ background: historyFilter === 'mine' ? '#3b82f6' : '#334155' }} onClick={() => { setHistoryFilter('mine'); loadHistory('mine'); }}>Meus</button>
            {family?.current_user_role === 'admin' && (
              <button className="btn-primary" style={{ background: historyFilter === 'family' ? '#3b82f6' : '#334155' }} onClick={() => { setHistoryFilter('family'); loadHistory('family'); }}>Família</button>
            )}
          </div>

          {loadingHistory ? (
            <p style={{ color: '#94a3b8' }}>Carregando histórico...</p>
          ) : (
            <div style={{ background: '#0f172a', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px 16px' }}>Data/Hora</th>
                    <th style={{ padding: '12px 16px' }}>URL Bloqueada</th>
                    <th style={{ padding: '12px 16px' }}>Usuário / Grupo</th>
                    <th style={{ padding: '12px 16px' }}>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum bloqueio registrado no histórico.</td></tr>
                  ) : historyData.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{new Date(item.timestamp).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '12px 16px', wordBreak: 'break-all', maxWidth: '350px' }}><span style={{ color: '#ef4444' }}>{item.url}</span></td>
                      <td style={{ padding: '12px 16px' }}>{item.block_source === 'USER' ? (item.username || '—') : (item.group_name || '—')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                          background: item.block_source === 'USER' ? '#1e3a8a' : '#4c1d95',
                          color: item.block_source === 'USER' ? '#93c5fd' : '#c4b5fd'
                        }}>
                          {item.block_source === 'USER' ? 'USUÁRIO' : 'GRUPO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && auth.isAuthenticated && auth.user && (
        <ProfilePanel user={auth.user} onUpdate={(updatedUser) => setAuth({ user: updatedUser, isAuthenticated: true })} />
      )}

      {tab === 'dashboard' && auth.isAuthenticated && (
        <DashboardPanel
          stats={dashboardStats}
          loading={loadingDashboard}
          period={dashboardPeriod}
          onPeriodChange={(period) => { setDashboardPeriod(period); loadDashboard(period, dashboardFamilyView); }}
          isAdmin={family?.current_user_role === 'admin'}
          familyView={dashboardFamilyView}
          onFamilyViewChange={(value) => { setDashboardFamilyView(value); loadDashboard(dashboardPeriod, value); }}
        />
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

      {tab === 'blocklists' && auth.isAuthenticated && (
        <BlockListsPanel
          blockLists={blockLists}
          loadingLists={loadingLists}
          onToggle={handleToggleBlockList}
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

      {showAuthModal && !auth.isAuthenticated && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuthModal(null)}>
              <X size={20} />
            </button>
            {showAuthModal === 'login' && (
              <LoginForm
                onLogin={async () => { setShowAuthModal(null); await loadData(); }}
                onSwitch={() => setShowAuthModal('register')}
              />
            )}
            {showAuthModal === 'register' && (
              <RegisterForm
                onRegister={async () => { setShowAuthModal(null); await loadData(); }}
                onSwitch={() => setShowAuthModal('login')}
              />
            )}
          </div>
        </div>
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

function BlockListsPanel({
  blockLists,
  loadingLists,
  onToggle,
}: {
  blockLists: BlockList[];
  loadingLists: boolean;
  onToggle: (list: BlockList) => Promise<void>;
}) {
  return (
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
        <div className="blocklist-grid">
          {blockLists.map(list => (
            <div key={list.id} className={`blocklist-card ${list.is_activated ? 'active' : ''}`}>
              <div className="blocklist-content">
                <div className="blocklist-header">
                  <strong>{list.name}</strong>
                  <span className={`blocklist-badge ${list.is_activated ? 'active' : ''}`}>
                    {list.is_activated ? 'ATIVADO' : 'DESATIVADO'}
                  </span>
                </div>
                <p className="blocklist-desc">{list.description}</p>
                <div className="blocklist-meta">
                  <Shield size={14} /> {list.domain_count.toLocaleString()} domínios
                </div>
              </div>
              <button
                onClick={() => onToggle(list)}
                className={`blocklist-btn ${list.is_activated ? 'active' : ''}`}
              >
                {list.is_activated ? (
                  <><ToggleRight size={18} /> Desativar Lista</>
                ) : (
                  <><ToggleLeft size={18} /> Ativar Lista</>
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
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  adult: '#f97316',
  social_media: '#3b82f6',
  malware: '#ef4444',
  fakenews: '#eab308',
  gambling: '#a855f7',
  unknown: '#64748b',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#22d3ee';
}

function shortenUrl(url: string, max = 60): string {
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

function KpiCard({ label, value, accent, icon }: { label: string; value: React.ReactNode; accent: string; icon: React.ReactNode }) {
  return (
    <div style={{
      flex: '1 1 200px',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
        <span style={{ color: accent, display: 'flex' }}>{icon}</span> {label}
      </div>
      <strong style={{ fontSize: '22px', color: '#f1f5f9', wordBreak: 'break-word' }}>{value}</strong>
    </div>
  );
}

function DashboardPanel({
  stats,
  loading,
  period,
  onPeriodChange,
  isAdmin,
  familyView,
  onFamilyViewChange,
}: {
  stats: DashboardStats | null;
  loading: boolean;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  isAdmin: boolean;
  familyView: boolean;
  onFamilyViewChange: (value: boolean) => void;
}) {
  const topDomain = stats?.top_blocked_domains[0];
  const topCategory = stats?.blocks_by_category[0];

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22d3ee', marginBottom: '10px' }}>
        <BarChart3 size={24} color="#22d3ee" /> Dashboard de Bloqueios
      </h2>
      <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
        Estatísticas dos acessos bloqueados {familyView ? 'da família' : 'da sua conta'}.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['7d', '30d', 'all'] as DashboardPeriod[]).map(value => (
          <button
            key={value}
            className="btn-primary"
            style={{ background: period === value ? '#3b82f6' : '#334155' }}
            onClick={() => onPeriodChange(value)}
          >
            {value === '7d' ? '7 dias' : value === '30d' ? '30 dias' : 'Tudo'}
          </button>
        ))}
        {isAdmin && (
          <button
            className="btn-primary"
            style={{ background: familyView ? '#7c3aed' : '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
            onClick={() => onFamilyViewChange(!familyView)}
          >
            <Users size={16} /> {familyView ? 'Vendo: Família' : 'Ver família'}
          </button>
        )}
      </div>

      {loading && <p style={{ color: '#94a3b8' }}>Carregando estatísticas...</p>}

      {!loading && !stats && (
        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum dado disponível.</p>
      )}

      {!loading && stats && (
        <>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <KpiCard label="Total no período" value={stats.summary.total_blocks} accent="#3b82f6" icon={<ShieldAlert size={18} />} />
            <KpiCard label="Hoje" value={stats.summary.total_today} accent="#f59e0b" icon={<History size={18} />} />
            <KpiCard label="Esta semana" value={stats.summary.total_week} accent="#a855f7" icon={<History size={18} />} />
            <KpiCard label="Este mês" value={stats.summary.total_month} accent="#10b981" icon={<History size={18} />} />
            <KpiCard
              label="Domínio mais bloqueado"
              value={topDomain ? `${topDomain.domain} (${topDomain.count})` : '—'}
              accent="#ef4444"
              icon={<Globe size={18} />}
            />
            <KpiCard
              label="Categoria mais bloqueada"
              value={topCategory ? `${topCategory.category_display} (${topCategory.count})` : '—'}
              accent={topCategory ? getCategoryColor(topCategory.category) : '#64748b'}
              icon={<List size={18} />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: '20px', marginBottom: '20px' }}>
            {stats.blocks_over_time.length > 0 && (
              <div className="family-block">
                <h3 style={{ marginBottom: '14px' }}>Bloqueios por período</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.blocks_over_time}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="count" name="Bloqueios" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats.blocks_by_category.length > 0 && (
              <div className="family-block">
                <h3 style={{ marginBottom: '14px' }}>Bloqueios por categoria</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.blocks_by_category}
                      dataKey="count"
                      nameKey="category_display"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      isAnimationActive={false}
                      label={(props: PieLabelRenderProps) => {
                        const entry = props.payload as DashboardCategory;
                        return `${entry.category_display}: ${entry.count}`;
                      }}
                    >
                      {stats.blocks_by_category.map(entry => (
                        <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats.top_blocked_domains.length > 0 && (
              <div className="family-block">
                <h3 style={{ marginBottom: '14px' }}>Top domínios bloqueados</h3>
                <ResponsiveContainer width="100%" height={Math.max(220, stats.top_blocked_domains.length * 36)}>
                  <BarChart data={stats.top_blocked_domains} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="domain" stroke="#94a3b8" fontSize={12} width={150} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Bloqueios" fill="#ef4444" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {familyView && stats.blocks_by_user.length > 0 && (
              <div className="family-block">
                <h3 style={{ marginBottom: '14px' }}>Bloqueios por usuário da família</h3>
                <ResponsiveContainer width="100%" height={Math.max(220, stats.blocks_by_user.length * 36)}>
                  <BarChart data={stats.blocks_by_user} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="username" stroke="#94a3b8" fontSize={12} width={120} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Bloqueios" fill="#a855f7" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="family-block">
            <h3 style={{ marginBottom: '14px' }}>Top URLs bloqueadas</h3>
            <ul className="compact-list">
              {stats.top_blocked_urls.map((item, index) => (
                <li key={`${item.url}_${index}`}>
                  <span>
                    <strong style={{ wordBreak: 'break-all' }}>{shortenUrl(item.url)}</strong>
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: '#7f1d1d',
                    color: '#fecaca',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {item.count}
                  </span>
                </li>
              ))}
              {stats.top_blocked_urls.length === 0 && (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhum bloqueio registrado.</p>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
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
            <ul className="compact-list invitation-list">
              {sentInvitations.map(invitation => (
                <li key={invitation.id}>
                  <span>
                    <strong>
                      {displayName(invitation.invited_user_first_name, invitation.invited_user_last_name, invitation.invited_user_username)}
                      <span className="username-inline">@{invitation.invited_user_username}</span>
                    </strong>
                    <span className="secondary-text">{invitation.email} · {formatInvitationStatus(invitation)}</span>
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

function formatInvitationStatus(invitation: FamilyInvitation) {
  if (invitation.status === 'accepted') {
    return `Membro desde ${formatDate(invitation.responded_at || invitation.created_at)}`;
  }
  if (invitation.status === 'pending') return 'Pendente';
  if (invitation.status === 'declined') return `Recusado em ${formatDate(invitation.responded_at || invitation.created_at)}`;
  if (invitation.status === 'cancelled') return `Cancelado em ${formatDate(invitation.responded_at || invitation.created_at)}`;
  return invitation.status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function LoginForm({ onLogin, onSwitch }: { onLogin: () => void, onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (usePin) {
        await pinLogin(username, pin);
      } else {
        await login(username, password);
      }
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={28} color="white" />
        </div>
      </div>
      <h2>Entrar no Zero Phishing</h2>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '-12px', marginBottom: '8px' }}>Acesse sua conta para sincronizar suas configurações</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="rule-input" type="text" placeholder="Usuário" value={username} onChange={event => setUsername(event.target.value)} required />
        {usePin ? (
          <input className="rule-input" type="password" placeholder="PIN" maxLength={6} value={pin} onChange={event => setPin(event.target.value)} required />
        ) : (
          <input className="rule-input" type="password" placeholder="Senha" value={password} onChange={event => setPassword(event.target.value)} required />
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Aguarde...' : (usePin ? 'Entrar com PIN' : 'Entrar')}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <a href="#" onClick={(event) => { event.preventDefault(); setUsePin(!usePin); }} style={{ color: '#94a3b8' }}>{usePin ? 'Usar senha' : 'Usar PIN'}</a>
        <span style={{ color: '#475569' }}>·</span>
        <a href="#" onClick={onSwitch} style={{ color: '#3b82f6' }}>Criar conta</a>
      </p>
    </div>
  );
}

function ProfilePanel({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email, pin: user.pin || '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updated = await updateProfile(form);
      onUpdate(updated);
      setSuccess('Perfil atualizado com sucesso.');
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase() || user.username[0].toUpperCase();

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <div>
      {success && <p className="form-success">{success}</p>}

      {!editing ? (
        <div className="profile-layout">
          {/* Profile Hero Card */}
          <div className="profile-hero">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-hero-info">
              <h2 className="profile-hero-name">{fullName || user.username}</h2>
              <span className="profile-hero-username">@{user.username}</span>
              <span className="profile-hero-since">
                <History size={13} /> Membro desde {formatDate(user.date_joined)}
              </span>
            </div>
            <button className="profile-edit-btn" onClick={() => setEditing(true)}>
              Editar Perfil
            </button>
          </div>

          {/* Info Cards Grid */}
          <div className="profile-cards">
            <div className="profile-info-card">
              <div className="profile-info-icon" style={{ background: '#1e3a5f' }}>
                <Mail size={18} color="#60a5fa" />
              </div>
              <div className="profile-info-data">
                <span className="profile-info-label">E-mail</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
            </div>

            <div className="profile-info-card">
              <div className="profile-info-icon" style={{ background: '#1a3a2a' }}>
                <Shield size={18} color="#4ade80" />
              </div>
              <div className="profile-info-data">
                <span className="profile-info-label">PIN de acesso rápido</span>
                <span className="profile-info-value">{user.pin ? '••••••' : 'Não definido'}</span>
              </div>
            </div>



            <div className="profile-info-card">
              <div className="profile-info-icon" style={{ background: '#1f2e3d' }}>
                <UserIcon size={18} color="#94a3b8" />
              </div>
              <div className="profile-info-data">
                <span className="profile-info-label">Nome de usuário</span>
                <span className="profile-info-value">{user.username}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-edit-panel">
          <div className="profile-edit-header">
            <div className="profile-avatar profile-avatar-sm">{initials}</div>
            <div>
              <h2 style={{ fontSize: '18px', color: '#f1f5f9', margin: 0 }}>Editar Perfil</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Atualize seus dados de conta</p>
            </div>
          </div>
          <form onSubmit={handleSave} className="profile-edit-form">
            <div className="profile-edit-row">
              <div className="profile-field">
                <label className="profile-field-label">Nome</label>
                <input className="rule-input" type="text" placeholder="Nome" value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">Sobrenome</label>
                <input className="rule-input" type="text" placeholder="Sobrenome" value={form.last_name} onChange={event => setForm({ ...form, last_name: event.target.value })} />
              </div>
            </div>
            <div className="profile-edit-row">
              <div className="profile-field">
                <label className="profile-field-label">E-mail</label>
                <input className="rule-input" type="email" placeholder="E-mail" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="profile-field">
                <label className="profile-field-label">PIN (4-6 dígitos)</label>
                <input className="rule-input" type="password" placeholder="••••••" maxLength={6} value={form.pin} onChange={event => setForm({ ...form, pin: event.target.value })} />
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="profile-edit-actions">
              <button className="btn-secondary" type="button" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
            </div>
          </form>
        </div>
      )}
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
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserPlus size={28} color="white" />
        </div>
      </div>
      <h2>Criar nova conta</h2>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '-12px', marginBottom: '8px' }}>Crie uma conta gratuita para proteger sua navegação</p>
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
