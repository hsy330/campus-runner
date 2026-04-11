import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const CAMPUS_LIST = ['东方红校区', '城南校区'];

export function RegisterPage() {
  const [form, setForm] = useState({ username: '', nickname: '', campus: CAMPUS_LIST[0], password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.nickname.trim() || !form.campus || !form.password) {
      setError('请填写所有必填项');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const result = await register(form);
      login(result.token, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>校园跑腿</h1>
        <p className="auth-subtitle">新用户注册</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="用户名（3-20位字母数字下划线）" value={form.username} onChange={(e) => update('username', e.target.value)} disabled={loading} />
          <input type="text" placeholder="昵称" value={form.nickname} onChange={(e) => update('nickname', e.target.value)} disabled={loading} />
          <select value={form.campus} onChange={(e) => update('campus', e.target.value)} disabled={loading}>
            {CAMPUS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="password" placeholder="密码（至少6位）" value={form.password} onChange={(e) => update('password', e.target.value)} disabled={loading} />
          <input type="password" placeholder="确认密码" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} disabled={loading} />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? '注册中...' : '注册'}</button>
        </form>
        <p className="auth-footer">已有账号？<Link to="/login">去登录</Link></p>
      </div>
    </div>
  );
}
