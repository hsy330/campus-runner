import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { acceptTask, getTaskDetail, updateTaskStatus } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const STATUS_LABELS = {
  open: '待接单',
  accepted: '已接单',
  running: '进行中',
  confirming: '待确认',
  finished: '已完成'
};

const STATUS_COLORS = {
  open: '#f59e0b',
  accepted: '#2563eb',
  running: '#2563eb',
  confirming: '#8b5cf6',
  finished: '#10b981'
};

export function TaskDetailPage() {
  const { taskId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  function reload() {
    getTaskDetail(taskId)
      .then((data) => setTask(data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTaskDetail(taskId)
      .then((data) => { if (active) setTask(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [taskId]);

  async function handleAction(action, nextStatus) {
    setActionLoading(action);
    try {
      if (action === 'accept') {
        await acceptTask(token, taskId);
      } else {
        await updateTaskStatus(token, taskId, nextStatus);
      }
      reload();
    } catch (err) {
      alert(err.message || '操作失败');
    } finally {
      setActionLoading('');
    }
  }

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;
  if (error) return <div className="page"><p className="auth-error">{error}</p></div>;
  if (!task) return <div className="page"><p className="empty-state">任务不存在</p></div>;

  const isPublisher = task.publisherId === user?.id;
  const isRunner = task.runnerId === user?.id;
  const statusLabel = STATUS_LABELS[task.status] || task.status;
  const statusColor = STATUS_COLORS[task.status] || '#64748b';

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <span className="task-category-tag">{task.category}</span>
        <span className="task-status-badge" style={{ background: statusColor }}>{statusLabel}</span>
        <span className="task-price">{task.price} 积分</span>
      </div>
      <h2>{task.title}</h2>
      <p className="detail-meta">{task.campus} · {task.deadlineText}</p>
      <p className="detail-meta">发布者：{task.publisherName}{task.runnerName ? ` · 接单者：${task.runnerName}` : ''}</p>

      <div className="detail-section">
        <h4>任务描述</h4>
        <p>{task.description}</p>
      </div>
      <div className="detail-section">
        <h4>取货/起点</h4>
        <p>{task.pickupText}</p>
      </div>
      <div className="detail-section">
        <h4>送达/终点</h4>
        <p>{task.deliveryText}</p>
      </div>
      {task.distanceText && (
        <div className="detail-section">
          <h4>距离</h4>
          <p>{task.distanceText}</p>
        </div>
      )}

      {/* 订单进度 */}
      {task.status !== 'open' && (
        <div className="detail-section">
          <h4>订单进度</h4>
          <div className="step-bar">
            {['accepted', 'running', 'confirming', 'finished'].map((step, i) => (
              <div key={step} className={`step-item ${task.status === step ? 'active' : ''} ${['accepted', 'running', 'confirming', 'finished'].indexOf(task.status) > i ? 'done' : ''}`}>
                <div className="step-dot" />
                <span>{STATUS_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="detail-actions">
        {task.status === 'open' && !isPublisher && (
          <button className="btn-primary" onClick={() => handleAction('accept')} disabled={!!actionLoading}>
            {actionLoading === 'accept' ? '接单中...' : '接单'}
          </button>
        )}
        {task.status === 'accepted' && isRunner && (
          <button className="btn-primary" onClick={() => handleAction('start', 'running')} disabled={!!actionLoading}>
            {actionLoading === 'start' ? '处理中...' : '开始执行'}
          </button>
        )}
        {task.status === 'running' && isRunner && (
          <button className="btn-primary" onClick={() => handleAction('confirm', 'confirming')} disabled={!!actionLoading}>
            {actionLoading === 'confirm' ? '处理中...' : '提交完成'}
          </button>
        )}
        {task.status === 'confirming' && isPublisher && (
          <button className="btn-primary" onClick={() => handleAction('finish', 'finished')} disabled={!!actionLoading}>
            {actionLoading === 'finish' ? '处理中...' : '确认验收'}
          </button>
        )}
        {task.status === 'finished' && (isPublisher || isRunner) && (
          <button className="btn-review" onClick={() => navigate(`/tasks/${taskId}/review`)}>
            评价
          </button>
        )}
        {isPublisher && task.status === 'open' && (
          <span className="badge-info">等待接单中...</span>
        )}
        <button className="btn-ghost" onClick={() => navigate(-1)}>返回</button>
      </div>
    </div>
  );
}
