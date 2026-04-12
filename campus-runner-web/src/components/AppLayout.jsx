import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CirclePlus, ClipboardList, Home, MessageCircle, UserRound } from 'lucide-react';

import { useAuth } from '../auth.jsx';
import { UserAvatar } from './UserAvatar.jsx';
import { getUnreadCount, updateProfile } from '../lib/api.js';

const CAMPUS_LIST = ['东方红校区', '城南校区'];

export function AppLayout({ children }) {
  const { token, user, updateUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { to: '/', label: '大厅', icon: Home },
    { to: '/publish', label: '发布', icon: CirclePlus },
    { to: '/orders', label: '订单', icon: ClipboardList },
    { to: '/chat', label: '消息', icon: MessageCircle, badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null },
    { to: '/profile', label: '我的', icon: UserRound }
  ];

  useEffect(() => {
    let active = true;
    const load = () => {
      getUnreadCount(token)
        .then((count) => {
          if (active) {
            setUnreadCount(Number(count) || 0);
          }
        })
        .catch(() => {
          if (active) {
            setUnreadCount(0);
          }
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [token]);

  async function handleCampusChange(e) {
    const campus = e.target.value;
    try {
      const nextUser = await updateProfile(token, { campus });
      updateUser({ ...user, ...nextUser });
    } catch (error) {
      window.alert(error.message || '切换校区失败');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav">
          <Link to="/" className="app-logo">校园跑腿</Link>
          <div className="app-nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  <span className="nav-link-inner">
                    <Icon size={16} strokeWidth={2.2} />
                    <span>{item.label}</span>
                    {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                  </span>
                </NavLink>
              );
            })}
          </div>
          <div className="app-header-right">
            <select className="campus-select" value={user?.campus || '东方红校区'} onChange={handleCampusChange}>
              {CAMPUS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="user-badge">
              <UserAvatar src={user?.avatar} name={user?.username} size="xs" />
              <span>{user?.username || '未登录'}</span>
            </div>
          </div>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
