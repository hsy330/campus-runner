import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Star, Wallet } from 'lucide-react';

import { UserAvatar } from '../components/UserAvatar.jsx';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import { getProfileBundle, rechargeWallet, updateProfile, withdrawWallet } from '../lib/api.js';

export function ProfilePage() {
  const { token, user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletModal, setWalletModal] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  function reloadBundle() {
    getProfileBundle(token)
      .then((data) => {
        setBundle(data);
        if (data?.profile) updateUser({ ...user, ...data.profile });
      })
      .catch(() => {});
  }

  useEffect(() => {
    let active = true;
    getProfileBundle(token)
      .then((data) => {
        if (!active) return;
        setBundle(data);
        if (data?.profile) updateUser({ ...user, ...data.profile });
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [token]);

  async function handleWalletAction() {
    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    setWalletLoading(true);
    try {
      if (walletModal === 'recharge') {
        await rechargeWallet(token, amount);
      } else {
        await withdrawWallet(token, amount);
      }
      setWalletModal(null);
      setWalletAmount('');
      reloadBundle();
    } catch (err) {
      alert(err.message || '操作失败');
    } finally {
      setWalletLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        setAvatarUploading(true);
        const nextUser = await updateProfile(token, { avatar: loadEvent.target?.result || '' });
        updateUser({ ...user, ...nextUser });
        reloadBundle();
      } catch (error) {
        alert(error.message || '头像更新失败');
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;

  const profile = bundle?.profile || user;
  const flows = bundle?.walletFlows || [];
  const reviews = bundle?.receivedReviews || [];

  return (
    <div className="page profile-page">
      <div className="profile-hero">
        <label className="profile-avatar profile-avatar--editable">
          <UserAvatar src={profile?.avatar} name={profile?.username} size="lg" className="profile-avatar__inner" />
          <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          <span className="profile-avatar-hint">{avatarUploading ? '上传中...' : '更换头像'}</span>
        </label>
        <div>
          <h2>{profile?.username || '未知用户'}</h2>
          <p className="subtle profile-hero-meta">
            <span><BadgeCheck size={14} /> {profile?.campus}</span>
            <span><Star size={14} /> 好评 {profile?.rating || 0}</span>
            <span><Wallet size={14} /> 完成 {profile?.completedCount || 0} 单</span>
          </p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-stat">
          <span className="stat-num">{formatAmount(profile?.wallet || 0)}</span>
          <span className="subtle">钱包积分</span>
          <div className="wallet-actions">
            <button className="btn-sm btn-recharge" onClick={() => setWalletModal('recharge')}>充值</button>
            <button className="btn-sm btn-withdraw" onClick={() => setWalletModal('withdraw')}>提现</button>
          </div>
        </div>
        <div className="profile-stat">
          <span className="stat-num">{profile?.score || 100}</span>
          <span className="subtle">信用分</span>
        </div>
      </div>

      {/* 评价记录 */}
      {reviews.length > 0 && (
        <section className="profile-section">
          <h3>收到的评价 ({reviews.length})</h3>
          {reviews.map((r) => (
            <div key={r.id} className="flow-row">
              <div className="flow-user-meta">
                <UserAvatar src={r.fromUserAvatar} name={r.fromUserName} size="sm" />
                <div style={{ flex: 1 }}>
                  <p className="flow-title">
                    {r.fromUserName || '匿名'}
                    <span style={{ color: '#f59e0b', marginLeft: 8 }}>{'★'.repeat(Math.round(r.average || 0))}</span>
                  </p>
                  {r.comment && <p className="subtle">{r.comment}</p>}
                  <p className="subtle">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {bundle?.publishedTasks?.length > 0 && (
        <section className="profile-section">
          <h3>我发布的任务</h3>
          {bundle.publishedTasks.slice(0, 5).map((t) => (
            <div key={t.id} className="flow-row" onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
              <div>
                <p className="flow-title">{t.title}</p>
                <p className="subtle">状态：{t.status === 'open' ? '待接单' : t.status}</p>
              </div>
              <span className="flow-amount">{formatAmount(t.price)} 积分</span>
            </div>
          ))}
        </section>
      )}

      {flows.length > 0 && (
        <section className="profile-section">
          <h3>钱包流水</h3>
          {flows.slice(0, 10).map((f) => (
            <div key={f.id} className="flow-row">
              <div>
                <p className="flow-title">{f.title}</p>
                <p className="subtle">{new Date(f.createdAt).toLocaleString()}</p>
              </div>
              <span className={`flow-amount ${f.amount >= 0 ? 'positive' : 'negative'}`}>
                {f.amount >= 0 ? '+' : ''}{formatAmount(f.amount)}
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="profile-actions">
        <button className="btn-logout" onClick={handleLogout}>退出登录</button>
      </div>

      {/* 钱包弹窗 */}
      {walletModal && (
        <div className="modal-overlay" onClick={() => setWalletModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{walletModal === 'recharge' ? '充值积分' : '提现申请'}</h3>
            <p className="subtle">当前余额：{formatAmount(profile?.wallet || 0)} 积分</p>
            <input
              type="number"
              placeholder="请输入积分数量"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              min={0.01}
              step={0.01}
            />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setWalletModal(null)}>取消</button>
              <button className="btn-primary" onClick={handleWalletAction} disabled={walletLoading}>
                {walletLoading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
