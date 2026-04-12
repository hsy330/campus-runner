import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, Polyline } from 'react-leaflet';
import { BadgeCheck, ShieldAlert, Star } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MapLibreBaseLayer } from '../components/MapLibreBaseLayer.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { acceptTask, cancelTask, getPublicProfile, getTaskDetail, updateTaskStatus } from '../lib/api.js';
import { UserProfileModal } from '../components/UserProfileModal.jsx';
import { StartChatButton } from './ChatPage.jsx';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import {
  TASK_PROGRESS_STEPS,
  TASK_STATUS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  canStartChatForTask
} from '../lib/taskStatus.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CAMPUS_CENTER = [28.1885, 112.8688];

export function TaskDetailPage() {
  const { taskId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);

  function reload() {
    getTaskDetail(taskId)
      .then((data) => {
        setTask(data);
        setError('');
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTaskDetail(taskId)
      .then((data) => {
        if (active) {
          setTask(data);
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
  }, [taskId]);

  async function handleAction(action, nextStatus) {
    setActionLoading(action);
    try {
      if (action === 'accept') {
        await acceptTask(token, taskId);
      } else if (action === 'cancel') {
        await cancelTask(token, taskId);
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

  async function openUserProfile(targetUserId) {
    try {
      const profile = await getPublicProfile(targetUserId);
      setSelectedProfile(profile);
    } catch (err) {
      alert(err.message || '加载资料失败');
    }
  }

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;
  if (error) return <div className="page"><p className="auth-error">{error}</p></div>;
  if (!task) return <div className="page"><p className="empty-state">任务不存在</p></div>;

  const isPublisher = task.publisherId === user?.id;
  const isRunner = task.runnerId === user?.id;
  const isParticipant = isPublisher || isRunner;
  const canAppeal = isParticipant && [
    TASK_STATUS.ACCEPTED,
    TASK_STATUS.RUNNING,
    TASK_STATUS.CONFIRMING,
    TASK_STATUS.FINISHED
  ].includes(task.status);

  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const statusColor = TASK_STATUS_COLORS[task.status] || '#64748b';

  const hasMap = task.pickupLocation?.latitude && task.deliveryLocation?.latitude;
  const pickupPos = task.pickupLocation ? [task.pickupLocation.latitude, task.pickupLocation.longitude] : CAMPUS_CENTER;
  const deliveryPos = task.deliveryLocation ? [task.deliveryLocation.latitude, task.deliveryLocation.longitude] : null;
  const routeLine = hasMap && deliveryPos ? [pickupPos, deliveryPos] : [];

  function getStepState(stepStatus) {
    const currentIndex = TASK_PROGRESS_STEPS.indexOf(task.status);
    const stepIndex = TASK_PROGRESS_STEPS.indexOf(stepStatus);
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return '';
  }

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <span className="task-category-tag">{task.category}</span>
        <span className="task-status-badge" style={{ background: statusColor }}>{statusLabel}</span>
        <span className="task-price">{formatAmount(task.price)} 积分</span>
      </div>
      <h2>{task.title}</h2>
      <p className="detail-meta">{task.campus} · {task.deadlineText}</p>
      <div className="detail-user-row">
        <button type="button" className="detail-user-chip" onClick={() => openUserProfile(task.publisherId)}>
          <UserAvatar src={task.publisherAvatar} name={task.publisherName} size="sm" />
          <span>发布者 {task.publisherName}</span>
        </button>
        {task.runnerName ? (
          <button type="button" className="detail-user-chip" onClick={() => openUserProfile(task.runnerId)}>
            <UserAvatar src={task.runnerAvatar} name={task.runnerName} size="sm" />
            <span>接单者 {task.runnerName}</span>
          </button>
        ) : null}
      </div>

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

      {task.images?.length > 0 && (
        <div className="detail-section">
          <h4>任务图片</h4>
          <div className="detail-images">
            {task.images.map((img, index) => <img key={index} src={img} alt="" className="detail-img" onClick={() => window.open(img)} />)}
          </div>
        </div>
      )}

      {hasMap && (
        <div className="detail-section">
          <h4>位置路线</h4>
          <div className="map-container">
            <MapContainer
              center={pickupPos}
              zoom={16}
              minZoom={1}
              maxBounds={[[-85, -180], [85, 180]]}
              style={{ height: 280, borderRadius: 12 }}
            >
              <MapLibreBaseLayer />
              <Marker position={pickupPos}><Popup>起点：{task.pickupText}</Popup></Marker>
              {deliveryPos && <Marker position={deliveryPos}><Popup>终点：{task.deliveryText}</Popup></Marker>}
              {routeLine.length === 2 && <Polyline positions={routeLine} color="#2563eb" weight={3} dashArray="8 4" />}
            </MapContainer>
          </div>
        </div>
      )}

      {TASK_PROGRESS_STEPS.includes(task.status) && (
        <div className="detail-section">
          <h4>订单进度</h4>
          <div className="step-bar">
            {TASK_PROGRESS_STEPS.map((step) => (
              <div key={step} className={`step-item ${getStepState(step)}`}>
                <div className="step-dot" />
                <span>{TASK_STATUS_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="detail-actions">
        {task.status === TASK_STATUS.OPEN && !isPublisher && (
          <button className="btn-primary" onClick={() => handleAction('accept')} disabled={!!actionLoading}>
            {actionLoading === 'accept' ? '接单中...' : '接单'}
          </button>
        )}
        {task.status === TASK_STATUS.OPEN && isPublisher && (
          <button className="btn-ghost" onClick={() => handleAction('cancel')} disabled={!!actionLoading}>
            {actionLoading === 'cancel' ? '取消中...' : '取消任务'}
          </button>
        )}
        {task.status === TASK_STATUS.ACCEPTED && isRunner && (
          <button className="btn-primary" onClick={() => handleAction('start', TASK_STATUS.RUNNING)} disabled={!!actionLoading}>
            {actionLoading === 'start' ? '处理中...' : '开始执行'}
          </button>
        )}
        {task.status === TASK_STATUS.RUNNING && isRunner && (
          <button className="btn-primary" onClick={() => handleAction('confirm', TASK_STATUS.CONFIRMING)} disabled={!!actionLoading}>
            {actionLoading === 'confirm' ? '处理中...' : '提交完成'}
          </button>
        )}
        {task.status === TASK_STATUS.CONFIRMING && isPublisher && (
          <button className="btn-primary" onClick={() => handleAction('finish', TASK_STATUS.FINISHED)} disabled={!!actionLoading}>
            {actionLoading === 'finish' ? '处理中...' : '确认验收'}
          </button>
        )}
        {task.status === TASK_STATUS.CONFIRMING && isRunner && (
          <p className="badge-info"><BadgeCheck size={16} /> 等待发布者确认验收，24 小时后会自动完成</p>
        )}
        {task.status === TASK_STATUS.FINISHED && isParticipant && (
          <button className="btn-review" onClick={() => navigate(`/tasks/${taskId}/review`)}><Star size={16} /> 评价</button>
        )}
        {isParticipant && canStartChatForTask(task) && (
          <StartChatButton taskId={taskId} />
        )}
        {canAppeal && (
          <button className="btn-ghost" onClick={() => navigate(`/tasks/${taskId}/appeal`)}><ShieldAlert size={16} /> 申诉</button>
        )}
        <button className="btn-ghost" onClick={() => navigate(-1)}>返回</button>
      </div>
      <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
}
