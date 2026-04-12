import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, MapPin } from 'lucide-react';

import { UserAvatar } from '../components/UserAvatar.jsx';
import { UserProfileModal } from '../components/UserProfileModal.jsx';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import { getPublicProfile, listTasks } from '../lib/api.js';

const CATEGORIES = ['全部', '跑腿', '代拿代买', '游戏陪玩', '二手闲置', '失物招领', '校内兼职', '其他'];
const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'price', label: '积分优先' }
];

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('全部');
  const [sort, setSort] = useState('latest');
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listTasks({ campus: user?.campus || '东方红校区', category: category === '全部' ? '' : category, sort })
      .then((data) => { if (active) { setTasks(Array.isArray(data) ? data : []); setError(''); } })
      .catch((err) => { if (active) { setError(err.message); setTasks([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.campus, category, sort]);

  async function handleOpenProfile(task, event) {
    event.stopPropagation();
    try {
      const profile = await getPublicProfile(task.publisherId);
      setSelectedProfile(profile);
    } catch (err) {
      window.alert(err.message || '加载资料失败');
    }
  }

  return (
    <div className="page home-page">
      <div className="home-toolbar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && <p className="page-loading">加载中...</p>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && tasks.length === 0 && (
        <p className="empty-state">当前校区暂无任务</p>
      )}

      <div className="task-grid">
        {tasks.map((task) => (
          <div key={task.id} className="task-card" onClick={() => navigate(`/tasks/${task.id}`)}>
            <div className="task-card-head">
              <span className="task-category-tag">{task.category}</span>
              <span className="task-price">{formatAmount(task.price)} 积分</span>
            </div>
            <h3 className="task-title">{task.title}</h3>
            <p className="task-meta task-meta--with-icon"><MapPin size={14} /> <span>{task.pickupText} → {task.deliveryText}</span></p>
            <div className="task-card-footer">
              <button type="button" className="task-publisher" onClick={(event) => handleOpenProfile(task, event)}>
                <UserAvatar src={task.publisherAvatar} name={task.publisherName} size="sm" />
                <span>{task.publisherName}</span>
              </button>
              <p className="task-meta subtle task-meta--with-icon"><Clock3 size={14} /> <span>{task.deadlineText}</span></p>
            </div>
          </div>
        ))}
      </div>
      <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
}
