import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listOrders } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, TASK_STATUS } from '../lib/taskStatus.js';

export function OrdersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('published');

  useEffect(() => {
    let active = true;
    listOrders(token)
      .then((data) => {
        if (active) {
          setOrders(Array.isArray(data) ? data : []);
          setError('');
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const published = orders.filter((item) => item.ownerRole === 'publisher');
  const accepted = orders.filter((item) => item.ownerRole === 'runner');

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

      {currentList.map((item) => (
        <div key={item.id} className="order-card" onClick={() => navigate(`/tasks/${item.taskId}`)}>
          <div className="order-card-top">
            <div>
              <p className="order-title">{item.taskTitle}</p>
              <p className="order-meta">{item.campus} · {item.withUser}</p>
            </div>
            <span className="order-price">{formatAmount(item.amount)} 积分</span>
          </div>
          <div className="order-card-bottom">
            <span className="order-status-tag" style={{ background: ORDER_STATUS_COLORS[item.status] || '#64748b' }}>
              {ORDER_STATUS_LABELS[item.status] || item.status}
            </span>
            {item.ownerRole === 'runner' && item.status === TASK_STATUS.FINISHED && !item.reviewed && (
              <span className="order-hint">待评价</span>
            )}
            <span className="subtle" style={{ marginLeft: 'auto' }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
