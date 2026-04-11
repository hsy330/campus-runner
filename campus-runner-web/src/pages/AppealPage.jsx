import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createAppeal, getTaskDetail } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const REASONS = [
  '对方未按时完成',
  '对方态度恶劣',
  '实际与描述不符',
  '无法联系到对方',
  '其他原因'
];

export function AppealPage() {
  const { taskId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');

  useEffect(() => {
    getTaskDetail(taskId).then((t) => setTaskTitle(t?.title || '')).catch(() => {});
  }, [taskId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) { alert('请选择申诉原因'); return; }
    if (!detail.trim()) { alert('请填写申诉说明'); return; }

    setSubmitting(true);
    try {
      await createAppeal(token, taskId, { reason, detail: detail.trim() });
      alert('申诉已提交，等待管理员处理');
      navigate(`/tasks/${taskId}`, { replace: true });
    } catch (err) {
      alert(err.message || '提交申诉失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page appeal-page">
      <h2>申诉订单</h2>
      {taskTitle && <p className="detail-meta">任务：{taskTitle}</p>}

      <form onSubmit={handleSubmit} className="review-form">
        <label className="form-label">申诉原因</label>
        <div className="quick-comments">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`quick-tag ${reason === r ? 'active' : ''}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="form-label">详细说明</label>
        <textarea
          rows={4}
          placeholder="请详细描述问题情况..."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '提交中...' : '提交申诉'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>取消</button>
      </form>
    </div>
  );
}
