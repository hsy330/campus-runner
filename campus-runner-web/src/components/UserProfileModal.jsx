import { Star, Wallet } from 'lucide-react';

import { UserAvatar } from './UserAvatar.jsx';

export function UserProfileModal({ profile, onClose }) {
  if (!profile) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(event) => event.stopPropagation()}>
        <div className="profile-modal-head">
          <UserAvatar src={profile.avatar} name={profile.username} size="lg" />
          <div>
            <h3>{profile.username || '未知用户'}</h3>
            <p className="subtle">{profile.campus} · 信用分 {profile.score || 100}</p>
          </div>
        </div>
        <div className="profile-modal-grid">
          <div className="profile-stat">
            <span className="stat-num"><Star size={18} /> {profile.rating || 0}</span>
            <span className="subtle">综合评分</span>
          </div>
          <div className="profile-stat">
            <span className="stat-num"><Wallet size={18} /> {profile.completedCount || 0}</span>
            <span className="subtle">完成订单</span>
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}
