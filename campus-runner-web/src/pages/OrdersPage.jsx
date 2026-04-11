import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listOrders } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const STATUS_LABELS = {
  open_waiting: '待接单',
  accepted: '已接单',
  running: '进行中',
  confirming: '待确认',
  finished: '已完成'
};

const STATUS_COLORS = {
  open_waiting: '#f59e0b',
  accepted: '#2563eb',
  running: '#2563eb',
  confirming: '#8b5cf6',
  finished: '#10b981'
};

export function OrdersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('published');

  useEffect(() => {
    let active = true;
    setLoading(true);
    listOrders(token)
      .then((data) => { if (active) setOrders(Array.isArray(data) ? data : []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const published = orders.filter((o) => o.ownerRole === 'publisher');
  const accepted = orders.filter((o) => o.ownerRole === 'runner');

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;
  if (error) return <div className="page"><p className="auth-error">{error}</p></div>;

  const currentList = tab === 'published' ? published : accepted;

  return (
    <div className="page orders-page">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'published' ? 'active' : ''}`} onClick={() => setTab('published')}>
          我发布的 ({published.length})
        </button>
        <button className={`tab-btn ${tab === 'accepted' ? 'active' : ''}`} onClick={() => setTab('accepted')}>
          我接单的 ({accepted.length})
        </button>
      </div>

      {currentList.length === 0 && (
        <p className="empty-state">{tab === 'published' ? '暂无我发布的任务' : '暂无我接单的任务'}</p>
      )}

      {currentList.map((o) => (
        <div key={o.id} className="order-card" onClick={() => navigate(`/tasks/${o.taskId}`)}>
          <div className="order-card-top">
            <div>
              <p className="order-title">{o.taskTitle}</p>
              <p className="order-meta">{o.campus} · {o.withUser}</p>
            </div>
            <span className="order-price">{o.amount} 积分</span>
          </div>
          <div className="order-card-bottom">
            <span className="order-status-tag" style={{ background: STATUS_COLORS[o.status] || '#64748b' }}>
              {STATUS_LABELS[o.status] || o.status}
            </span>
            {o.ownerRole === 'runner' && o.status === 'finished' && !o.reviewed && (
              <span className="order-hint">待评价</span>
            )}
            <span className="subtle" style={{ marginLeft: 'auto' }}>
              {new Date(o.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
