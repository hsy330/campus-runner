import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  adminLogin,
  listSensitiveWords,
  addSensitiveWord,
  removeSensitiveWord,
  listModerationLogs,
  listAdminAppeals,
  handleAppeal
} from '../lib/api.js';

const ADMIN_TOKEN_KEY = 'campus_runner_admin_token';

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
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>管理后台</h1>
        <p className="auth-subtitle">管理员登录</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="管理员账号" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [token] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [tab, setTab] = useState('words');
  const navigate = useNavigate();

  if (!token) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h2>管理后台</h2>
        <button className="btn-logout" onClick={handleLogout}>退出</button>
      </div>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'words' ? 'active' : ''}`} onClick={() => setTab('words')}>违禁词</button>
        <button className={`tab-btn ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>审核日志</button>
        <button className={`tab-btn ${tab === 'appeals' ? 'active' : ''}`} onClick={() => setTab('appeals')}>申诉处理</button>
      </div>
      {tab === 'words' && <WordsPanel token={token} />}
      {tab === 'logs' && <LogsPanel token={token} />}
      {tab === 'appeals' && <AppealsPanel token={token} />}
    </div>
  );
}

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
    try {
      const data = await removeSensitiveWord(token, word);
      setWords(data);
    } catch (err) {
      alert(err.message);
    }
  }

  if (!words) return <p className="page-loading">加载中...</p>;

  return (
    <div className="admin-section">
      <div className="admin-add-row">
        <input type="text" placeholder="输入新敏感词" value={newWord} onChange={(e) => setNewWord(e.target.value)} />
        <button className="btn-primary" onClick={handleAdd} disabled={loading}>{loading ? '添加中...' : '添加'}</button>
      </div>
      <div className="admin-word-list">
        {words.map((w) => (
          <span key={w} className="admin-word-tag">
            {w}
            <button className="admin-word-del" onClick={() => handleRemove(w)}>×</button>
          </span>
        ))}
        {words.length === 0 && <p className="subtle">暂无敏感词</p>}
      </div>
    </div>
  );
}

function LogsPanel({ token }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    listModerationLogs(token).then(setLogs).catch(() => {});
  }, [token]);

  if (!logs) return <p className="page-loading">加载中...</p>;

  return (
    <div className="admin-section">
      {logs.map((log) => (
        <div key={log.id} className="order-card">
          <div className="order-card-top">
            <div>
              <p className="order-title">{log.contentPreview}</p>
              <p className="order-meta">{log.type} · {log.status}</p>
            </div>
          </div>
          <p className="subtle">{new Date(log.createdAt).toLocaleString()}</p>
        </div>
      ))}
      {logs.length === 0 && <p className="empty-state">暂无审核日志</p>}
    </div>
  );
}

function AppealsPanel({ token }) {
  const [appeals, setAppeals] = useState(null);

  function load() {
    listAdminAppeals(token).then(setAppeals).catch(() => {});
  }

  useEffect(() => { load(); }, [token]);

  async function handleAction(id, action) {
    try {
      await handleAppeal(token, id, action);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!appeals) return <p className="page-loading">加载中...</p>;

  return (
    <div className="admin-section">
      {appeals.map((a) => (
        <div key={a.id} className="order-card">
          <div className="order-card-top">
            <div>
              <p className="order-title">{a.taskTitle}</p>
              <p className="order-meta">{a.fromUserName} · {a.reason}</p>
              <p className="subtle">{a.detail}</p>
            </div>
            <span className="order-status-tag"
              style={{ background: a.status === 'pending' ? '#f59e0b' : a.status === 'resolved' ? '#10b981' : '#dc2626' }}>
              {a.status === 'pending' ? '待处理' : a.status === 'resolved' ? '已处理' : '已驳回'}
            </span>
          </div>
          {a.status === 'pending' && (
            <div className="admin-actions">
              <button className="btn-primary" onClick={() => handleAction(a.id, 'resolved')}>通过</button>
              <button className="btn-logout" onClick={() => handleAction(a.id, 'rejected')}>驳回</button>
            </div>
          )}
        </div>
      ))}
      {appeals.length === 0 && <p className="empty-state">暂无申诉</p>}
    </div>
  );
}
