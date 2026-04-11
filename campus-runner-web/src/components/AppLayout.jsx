import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth.jsx';

const CAMPUS_LIST = ['东方红校区', '城南校区'];

export function AppLayout({ children }) {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  function handleCampusChange(e) {
    const campus = e.target.value;
    updateUser({ ...user, campus });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav">
          <Link to="/" className="app-logo">校园跑腿</Link>
          <div className="app-nav-links">
            <NavLink to="/" end>大厅</NavLink>
            <NavLink to="/publish">发布</NavLink>
            <NavLink to="/orders">订单</NavLink>
            <NavLink to="/chat">消息</NavLink>
            <NavLink to="/profile">我的</NavLink>
          </div>
          <div className="app-header-right">
            <select className="campus-select" value={user?.campus || '东方红校区'} onChange={handleCampusChange}>
              {CAMPUS_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="user-badge">{user?.nickname || user?.username || '未登录'}</span>
          </div>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
