import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await login({ username: username.trim(), password });
      authLogin(result.token, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>校园跑腿</h1>
        <p className="auth-subtitle">用户登录</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
        <p className="auth-footer">还没有账号？<Link to="/register">立即注册</Link></p>
      </div>
    </div>
  );
}
