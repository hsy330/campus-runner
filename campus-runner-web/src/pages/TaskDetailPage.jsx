import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { acceptTask, getTaskDetail, updateTaskStatus } from '../lib/api.js';
import { StartChatButton } from './ChatPage.jsx';
import { useAuth } from '../auth.jsx';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_LABELS = { open: '待接单', accepted: '已接单', running: '进行中', confirming: '待确认', finished: '已完成' };
const STATUS_COLORS = { open: '#f59e0b', accepted: '#2563eb', running: '#2563eb', confirming: '#8b5cf6', finished: '#10b981' };
const CAMPUS_CENTER = [28.1885, 112.8688]; // 湖南第一师范学院

const STATUS_STEPS = ['accepted', 'running', 'confirming', 'finished'];

export function TaskDetailPage() {
  const { taskId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  function reload() {
    getTaskDetail(taskId).then(setTask).catch((err) => setError(err.message));
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
      if (action === 'accept') await acceptTask(token, taskId);
      else await updateTaskStatus(token, taskId, nextStatus);
      reload();
    } catch (err) { alert(err.message || '操作失败'); }
    finally { setActionLoading(''); }
  }

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;
  if (error) return <div className="page"><p className="auth-error">{error}</p></div>;
  if (!task) return <div className="page"><p className="empty-state">任务不存在</p></div>;

  const isPublisher = task.publisherId === user?.id;
  const isRunner = task.runnerId === user?.id;
  const isParticipant = isPublisher || isRunner;
  const statusLabel = STATUS_LABELS[task.status] || task.status;
  const statusColor = STATUS_COLORS[task.status] || '#64748b';

  const hasMap = task.pickupLocation?.latitude && task.deliveryLocation?.latitude;
  const pickupPos = task.pickupLocation ? [task.pickupLocation.latitude, task.pickupLocation.longitude] : CAMPUS_CENTER;
  const deliveryPos = task.deliveryLocation ? [task.deliveryLocation.latitude, task.deliveryLocation.longitude] : null;
  const routeLine = hasMap && deliveryPos ? [pickupPos, deliveryPos] : [];

  function getStepState(stepStatus) {
    const currentIndex = STATUS_STEPS.indexOf(task.status);
    const stepIndex = STATUS_STEPS.indexOf(stepStatus);
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return '';
  }

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
        <p>{task.pickupText || '未指定'}</p>
      </div>
      <div className="detail-section">
        <h4>送达/终点</h4>
        <p>{task.deliveryText || '未指定'}</p>
      </div>
      {task.distanceText && (
        <div className="detail-section">
          <h4>距离</h4>
          <p>{task.distanceText}</p>
        </div>
      )}

      {/* 图片展示 */}
      {task.images?.length > 0 && (
        <div className="detail-section">
          <h4>任务图片</h4>
          <div className="detail-images">
            {task.images.map((img, i) => <img key={i} src={img} alt="" className="detail-img" onClick={() => window.open(img)} />)}
          </div>
        </div>
      )}

      {/* 地图展示 */}
      {hasMap && (
        <div className="detail-section">
          <h4>位置路线</h4>
          <div className="map-container">
            <MapContainer center={pickupPos} zoom={16} style={{ height: 280, borderRadius: 12 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
              <Marker position={pickupPos}><Popup>起点：{task.pickupText}</Popup></Marker>
              {deliveryPos && <Marker position={deliveryPos}><Popup>终点：{task.deliveryText}</Popup></Marker>}
              {routeLine.length === 2 && <Polyline positions={routeLine} color="#2563eb" weight={3} dashArray="8 4" />}
            </MapContainer>
          </div>
        </div>
      )}

      {/* 订单进度 */}
      {task.status !== 'open' && (
        <div className="detail-section">
          <h4>订单进度</h4>
          <div className="step-bar">
            {STATUS_STEPS.map((step) => (
              <div key={step} className={`step-item ${getStepState(step)}`}>
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
        {task.status === 'confirming' && isRunner && (
          <p className="badge-info">等待发布者确认验收...</p>
        )}
        {task.status === 'finished' && isParticipant && (
          <button className="btn-review" onClick={() => navigate(`/tasks/${taskId}/review`)}>评价</button>
        )}
        {isParticipant && task.status !== 'open' && (
          <StartChatButton taskId={taskId} />
        )}
        {isParticipant && task.status !== 'open' && task.status !== 'finished' && (
          <button className="btn-ghost" onClick={() => navigate(`/tasks/${taskId}/appeal`)}>申诉</button>
        )}
        <button className="btn-ghost" onClick={() => navigate(-1)}>返回</button>
      </div>
    </div>
  );
}
