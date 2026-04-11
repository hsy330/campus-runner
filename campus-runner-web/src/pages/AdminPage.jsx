import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  adminLogin,
  verifyAdminSession,
  getAdminStats,
  listAdminUsers,
  banUser,
  unbanUser,
  listAdminTasks,
  approveTask,
  removeTask,
  listAdminOrders,
  listAdminWalletFlows,
  listAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  listSensitiveWords,
  addSensitiveWord,
  removeSensitiveWord,
  listModerationLogs,
  listAdminAppeals,
  handleAppeal
} from '../lib/api.js';

const ADMIN_TOKEN_KEY = 'campus_runner_admin_token';

const NAV_ITEMS = [
  { key: 'overview', label: '数据概览', icon: '&#9632;' },
  { key: 'users', label: '用户管理', icon: '&#9786;' },
  { key: 'tasks', label: '任务管理', icon: '&#9998;' },
  { key: 'orders', label: '订单管理', icon: '&#9776;' },
  { key: 'finance', label: '财务管理', icon: '&#9733;' },
  { key: 'withdrawals', label: '提现审核', icon: '&#10070;' },
  { key: 'words', label: '违禁词', icon: '&#9888;' },
  { key: 'logs', label: '审核日志', icon: '&#9776;' },
  { key: 'appeals', label: '申诉处理', icon: '&#9872;' }
];

/* ═══════════════ Admin Login ═══════════════ */
export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      navigate('/admin/overview', { replace: true });
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">&#9881;</div>
        <h1>校园跑腿 · 管理后台</h1>
        <p className="admin-login-subtitle">管理员账号登录</p>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <input type="text" placeholder="管理员账号" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════ Admin Dashboard ═══════════════ */
export function AdminDashboardPage() {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [admin, setAdmin] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [page, setPage] = useState('overview');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    verifyAdminSession(token)
      .then((data) => {
        setAdmin(data);
        setVerifying(false);
      })
      .catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken('');
        navigate('/admin/login', { replace: true });
      });
  }, [token]);

  useEffect(() => {
    const path = location.pathname.replace('/admin/', '') || 'overview';
    if (NAV_ITEMS.some(item => item.key === path)) {
      setPage(path);
    }
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken('');
    navigate('/admin/login', { replace: true });
  }

  function handleNav(key) {
    setPage(key);
    navigate(`/admin/${key}`, { replace: true });
  }

  if (verifying) {
    return <div className="page-loading">验证管理员身份...</div>;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-icon">&#9881;</span>
          <span className="admin-sidebar-title">校园跑腿</span>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`admin-nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => handleNav(item.key)}
            >
              <span className="admin-nav-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">{(admin?.name || 'A')[0]}</div>
            <div className="admin-user-detail">
              <span className="admin-user-name">{admin?.name || '管理员'}</span>
              <span className="admin-user-role">超级管理员</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>退出登录</button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <h2 className="admin-topbar-title">{NAV_ITEMS.find(i => i.key === page)?.label || '管理后台'}</h2>
          <span className="admin-topbar-time">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </header>
        <div className="admin-content">
          {page === 'overview' && <OverviewPanel token={token} />}
          {page === 'users' && <UsersPanel token={token} />}
          {page === 'tasks' && <TasksPanel token={token} />}
          {page === 'orders' && <OrdersPanel token={token} />}
          {page === 'finance' && <FinancePanel token={token} />}
          {page === 'withdrawals' && <WithdrawalsPanel token={token} />}
          {page === 'words' && <WordsPanel token={token} />}
          {page === 'logs' && <LogsPanel token={token} />}
          {page === 'appeals' && <AppealsPanel token={token} />}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════ Overview Panel ═══════════════ */
function OverviewPanel({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats(token).then(setStats).catch(() => {});
  }, [token]);

  if (!stats) return <div className="page-loading">加载统计数据...</div>;

  const cards = [
    { label: '总用户数', value: stats.totalUsers, color: '#2563eb', bg: '#eff6ff' },
    { label: '总任务数', value: stats.totalTasks, color: '#7c3aed', bg: '#f5f3ff' },
    { label: '待接单', value: stats.openTasks, color: '#f59e0b', bg: '#fffbeb' },
    { label: '进行中', value: stats.acceptedTasks + stats.runningTasks, color: '#06b6d4', bg: '#ecfeff' },
    { label: '已完成', value: stats.finishedTasks, color: '#10b981', bg: '#ecfdf5' },
    { label: '总订单数', value: stats.totalOrders, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: '待处理申诉', value: stats.pendingAppeals, color: '#ef4444', bg: '#fef2f2' },
    { label: '待审核提现', value: stats.pendingWithdrawals, color: '#f97316', bg: '#fff7ed' },
    { label: '累计交易额', value: `${stats.totalRevenue} 积分`, color: '#059669', bg: '#ecfdf5' },
    { label: '今日新增任务', value: stats.todayTasks, color: '#2563eb', bg: '#eff6ff' },
    { label: '今日新增用户', value: stats.todayUsers, color: '#7c3aed', bg: '#f5f3ff' }
  ];

  return (
    <div className="admin-overview">
      <div className="admin-stat-grid">
        {cards.map((c, i) => (
          <div key={i} className="admin-stat-card" style={{ background: c.bg }}>
            <span className="admin-stat-value" style={{ color: c.color }}>{c.value}</span>
            <span className="admin-stat-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Users Panel ═══════════════ */
function UsersPanel({ token }) {
  const [data, setData] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  function load(p = page, kw = keyword) {
    setLoading(true);
    listAdminUsers(token, kw, p, 10)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  function handleSearch() {
    setPage(1);
    load(1, keyword);
  }

  async function handleBan(userId, banned) {
    if (!confirm(banned ? '确定要封禁该用户吗？' : '确定要解封该用户吗？')) return;
    try {
      await (banned ? banUser(token, userId) : unbanUser(token, userId));
      load();
    } catch (err) { alert(err.message); }
  }

  const users = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="admin-table-panel">
      <div className="admin-toolbar">
        <div className="admin-search-bar">
          <input type="text" placeholder="搜索用户名/昵称..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <button className="btn-primary btn-sm" onClick={handleSearch}>搜索</button>
        </div>
        <span className="admin-toolbar-info">共 {total} 个用户</span>
      </div>
      {loading ? <div className="page-loading">加载中...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>昵称</th>
                <th>校区</th>
                <th>评分</th>
                <th>完成数</th>
                <th>钱包</th>
                <th>实名</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="admin-td-id">{u.id}</td>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-cell-avatar">{(u.nickname || '?')[0]}</div>
                      <div>
                        <div className="admin-user-cell-name">{u.nickname}</div>
                        <div className="admin-user-cell-sub">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.campus}</td>
                  <td>{u.rating || '-'}</td>
                  <td>{u.completedCount || 0}</td>
                  <td className="admin-td-num">{u.wallet}</td>
                  <td><span className={`admin-badge ${u.authStatus === '已实名' ? 'admin-badge-green' : 'admin-badge-gray'}`}>{u.authStatus}</span></td>
                  <td><span className={`admin-badge ${u.banned ? 'admin-badge-red' : 'admin-badge-green'}`}>{u.banned ? '已封禁' : '正常'}</span></td>
                  <td>
                    {u.banned
                      ? <button className="admin-action-btn admin-action-green" onClick={() => handleBan(u.id, false)}>解封</button>
                      : <button className="admin-action-btn admin-action-red" onClick={() => handleBan(u.id, true)}>封禁</button>
                    }
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={9} className="admin-table-empty">暂无用户数据</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</button>
          <span className="admin-page-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Tasks Panel ═══════════════ */
function TasksPanel({ token }) {
  const [data, setData] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'open', label: '待接单' },
    { value: 'accepted', label: '已接单' },
    { value: 'running', label: '进行中' },
    { value: 'confirming', label: '待确认' },
    { value: 'finished', label: '已完成' },
    { value: 'removed', label: '已删除' }
  ];

  function load(p = page) {
    setLoading(true);
    listAdminTasks(token, status, keyword, p, 10)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [token]);

  function handleSearch() {
    setPage(1);
    load(1);
  }

  async function handleApprove(taskId) {
    if (!confirm('确定要通过审核？')) return;
    try { await approveTask(token, taskId); load(); } catch (err) { alert(err.message); }
  }

  async function handleRemove(taskId) {
    if (!confirm('确定要删除该任务？此操作不可恢复！')) return;
    try { await removeTask(token, taskId); load(); } catch (err) { alert(err.message); }
  }

  const tasks = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const statusMap = {
    open: { text: '待接单', color: '#f59e0b' },
    accepted: { text: '已接单', color: '#2563eb' },
    running: { text: '进行中', color: '#06b6d4' },
    confirming: { text: '待确认', color: '#8b5cf6' },
    finished: { text: '已完成', color: '#10b981' },
    removed: { text: '已删除', color: '#dc2626' }
  };

  return (
    <div className="admin-table-panel">
      <div className="admin-toolbar">
        <div className="admin-search-bar">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setTimeout(() => load(1), 0); }}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="text" placeholder="搜索任务标题..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <button className="btn-primary btn-sm" onClick={handleSearch}>搜索</button>
        </div>
        <span className="admin-toolbar-info">共 {total} 个任务</span>
      </div>
      {loading ? <div className="page-loading">加载中...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>分类</th>
                <th>价格</th>
                <th>发布者</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="admin-td-id">{t.id}</td>
                  <td className="admin-td-title">{t.title}</td>
                  <td><span className="admin-badge admin-badge-blue">{t.category}</span></td>
                  <td className="admin-td-num">{t.price}</td>
                  <td>{t.publisherName}</td>
                  <td>
                    <span className="admin-status-dot" style={{ background: statusMap[t.status]?.color || '#999' }} />
                    {statusMap[t.status]?.text || t.status}
                  </td>
                  <td className="admin-td-time">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="admin-td-actions">
                    {t.auditStatus === 'pending' && <button className="admin-action-btn admin-action-green" onClick={() => handleApprove(t.id)}>通过</button>}
                    {t.status !== 'removed' && <button className="admin-action-btn admin-action-red" onClick={() => handleRemove(t.id)}>删除</button>}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={8} className="admin-table-empty">暂无任务数据</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</button>
          <span className="admin-page-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Orders Panel ═══════════════ */
function OrdersPanel({ token }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  function load(p = page) {
    listAdminOrders(token, p, 10).then(setData).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  const orders = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const statusMap = {
    open_waiting: { text: '待接单', color: '#f59e0b' },
    accepted: { text: '已接单', color: '#2563eb' },
    running: { text: '进行中', color: '#06b6d4' },
    confirming: { text: '待确认', color: '#8b5cf6' },
    finished: { text: '已完成', color: '#10b981' }
  };

  return (
    <div className="admin-table-panel">
      <div className="admin-toolbar">
        <span className="admin-toolbar-info">共 {total} 个订单</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>任务</th>
              <th>角色</th>
              <th>金额</th>
              <th>对方</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="admin-td-id">{o.id}</td>
                <td className="admin-td-title">{o.taskTitle}</td>
                <td><span className={`admin-badge ${o.role === 'publisher' ? 'admin-badge-blue' : 'admin-badge-purple'}`}>{o.role === 'publisher' ? '发布者' : '跑腿者'}</span></td>
                <td className="admin-td-num">{o.amount}</td>
                <td>{o.withUser}</td>
                <td>
                  <span className="admin-status-dot" style={{ background: statusMap[o.status]?.color || '#999' }} />
                  {statusMap[o.status]?.text || o.status}
                </td>
                <td className="admin-td-time">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="admin-table-empty">暂无订单数据</td></tr>}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</button>
          <span className="admin-page-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Finance Panel ═══════════════ */
function FinancePanel({ token }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  function load(p = page) {
    listAdminWalletFlows(token, p, 15).then(setData).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  const flows = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  const typeMap = {
    freeze: { text: '冻结', color: '#f59e0b' },
    income: { text: '收入', color: '#10b981' },
    expense: { text: '支出', color: '#dc2626' },
    withdraw: { text: '提现', color: '#8b5cf6' },
    recharge: { text: '充值', color: '#2563eb' },
    reward: { text: '奖励', color: '#06b6d4' },
    refund: { text: '退款', color: '#f97316' }
  };

  return (
    <div className="admin-table-panel">
      <div className="admin-toolbar">
        <span className="admin-toolbar-info">共 {total} 条流水记录</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>描述</th>
              <th>类型</th>
              <th>金额</th>
              <th>余额</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.id}>
                <td className="admin-td-id">{f.id}</td>
                <td>{f.nickname}</td>
                <td>{f.title}</td>
                <td><span className="admin-badge" style={{ background: (typeMap[f.type]?.color || '#999') + '18', color: typeMap[f.type]?.color || '#999' }}>{typeMap[f.type]?.text || f.type}</span></td>
                <td className={f.amount >= 0 ? 'admin-td-num admin-text-green' : 'admin-td-num admin-text-red'}>{f.amount >= 0 ? '+' : ''}{f.amount}</td>
                <td className="admin-td-num">{f.balanceAfter}</td>
                <td className="admin-td-time">{new Date(f.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {flows.length === 0 && <tr><td colSpan={7} className="admin-table-empty">暂无流水记录</td></tr>}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</button>
          <span className="admin-page-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Withdrawals Panel ═══════════════ */
function WithdrawalsPanel({ token }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  function load(p = page) {
    listAdminWithdrawals(token, p, 10).then(setData).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  async function handleAction(id, action) {
    if (!confirm(action === 'approve' ? '确定批准该提现？' : '确定驳回该提现？')) return;
    try {
      await (action === 'approve' ? approveWithdrawal(token, id) : rejectWithdrawal(token, id));
      load();
    } catch (err) { alert(err.message); }
  }

  const withdrawals = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div className="admin-table-panel">
      <div className="admin-toolbar">
        <span className="admin-toolbar-info">共 {total} 条提现申请</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>金额</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="admin-td-id">{w.id}</td>
                <td>{w.nickname}</td>
                <td className="admin-td-num">{w.amount}</td>
                <td>
                  <span className={`admin-badge ${w.status === 'pending' ? 'admin-badge-yellow' : w.status === 'approved' ? 'admin-badge-green' : 'admin-badge-red'}`}>
                    {w.status === 'pending' ? '待审核' : w.status === 'approved' ? '已批准' : '已驳回'}
                  </span>
                </td>
                <td className="admin-td-time">{new Date(w.createdAt).toLocaleString()}</td>
                <td className="admin-td-actions">
                  {w.status === 'pending' && (
                    <>
                      <button className="admin-action-btn admin-action-green" onClick={() => handleAction(w.id, 'approve')}>批准</button>
                      <button className="admin-action-btn admin-action-red" onClick={() => handleAction(w.id, 'reject')}>驳回</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {withdrawals.length === 0 && <tr><td colSpan={6} className="admin-table-empty">暂无提现申请</td></tr>}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>上一页</button>
          <span className="admin-page-info">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>下一页</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Words Panel ═══════════════ */
function WordsPanel({ token }) {
  const [words, setWords] = useState(null);
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    listSensitiveWords(token).then(setWords).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  async function handleAdd() {
    if (!newWord.trim()) return;
    setLoading(true);
    try {
      const data = await addSensitiveWord(token, newWord.trim());
      setWords(data);
      setNewWord('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(word) {
    if (!confirm(`确定要删除敏感词「${word}」？`)) return;
    try {
      const data = await removeSensitiveWord(token, word);
      setWords(data);
    } catch (err) {
      alert(err.message);
    }
  }

  if (!words) return <div className="page-loading">加载中...</div>;

  return (
    <div className="admin-section">
      <div className="admin-add-row">
        <input type="text" placeholder="输入新敏感词" value={newWord} onChange={(e) => setNewWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <button className="btn-primary" onClick={handleAdd} disabled={loading}>{loading ? '添加中...' : '添加'}</button>
      </div>
      <div className="admin-word-list">
        {words.map((w) => (
          <span key={w} className="admin-word-tag">
            {w}
            <button className="admin-word-del" onClick={() => handleRemove(w)}>&times;</button>
          </span>
        ))}
        {words.length === 0 && <p className="empty-state">暂无敏感词</p>}
      </div>
    </div>
  );
}

/* ═══════════════ Logs Panel ═══════════════ */
function LogsPanel({ token }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    listModerationLogs(token).then(setLogs).catch(() => {});
  }, [token]);

  if (!logs) return <div className="page-loading">加载中...</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>类型</th>
            <th>内容预览</th>
            <th>状态</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="admin-td-id">{log.id}</td>
              <td><span className="admin-badge admin-badge-blue">{log.type}</span></td>
              <td className="admin-td-title">{log.contentPreview}</td>
              <td>
                <span className={`admin-badge ${log.status === 'approved' ? 'admin-badge-green' : log.status === 'removed' ? 'admin-badge-red' : 'admin-badge-yellow'}`}>
                  {log.status === 'approved' ? '已通过' : log.status === 'removed' ? '已删除' : '待审核'}
                </span>
              </td>
              <td className="admin-td-time">{new Date(log.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan={5} className="admin-table-empty">暂无审核日志</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════ Appeals Panel ═══════════════ */
function AppealsPanel({ token }) {
  const [appeals, setAppeals] = useState(null);

  function load() {
    listAdminAppeals(token).then(setAppeals).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  async function handleAction(id, action) {
    if (!confirm(action === 'resolved' ? '确定通过该申诉？' : '确定驳回该申诉？')) return;
    try {
      await handleAppeal(token, id, action);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!appeals) return <div className="page-loading">加载中...</div>;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>任务</th>
            <th>申诉人</th>
            <th>原因</th>
            <th>详情</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {appeals.map((a) => (
            <tr key={a.id}>
              <td className="admin-td-id">{a.id}</td>
              <td className="admin-td-title">{a.taskTitle}</td>
              <td>{a.fromUserName}</td>
              <td>{a.reason}</td>
              <td className="admin-td-detail">{a.detail}</td>
              <td>
                <span className={`admin-badge ${a.status === 'pending' ? 'admin-badge-yellow' : a.status === 'resolved' ? 'admin-badge-green' : 'admin-badge-red'}`}>
                  {a.status === 'pending' ? '待处理' : a.status === 'resolved' ? '已处理' : '已驳回'}
                </span>
              </td>
              <td className="admin-td-time">{new Date(a.createdAt).toLocaleString()}</td>
              <td className="admin-td-actions">
                {a.status === 'pending' && (
                  <>
                    <button className="admin-action-btn admin-action-green" onClick={() => handleAction(a.id, 'resolved')}>通过</button>
                    <button className="admin-action-btn admin-action-red" onClick={() => handleAction(a.id, 'rejected')}>驳回</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {appeals.length === 0 && <tr><td colSpan={8} className="admin-table-empty">暂无申诉</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
