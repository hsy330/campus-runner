import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createReview, getTaskDetail } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const QUICK_COMMENTS = [
  '非常满意，速度很快',
  '态度很好，值得推荐',
  '完成质量高',
  '沟通顺畅',
  '下次还找你'
];

function StarRating({ value, onChange }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= value ? 'active' : ''}`}
          onClick={() => onChange(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewPage() {
  const { taskId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [speed, setSpeed] = useState(0);
  const [attitude, setAttitude] = useState(0);
  const [quality, setQuality] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (speed === 0 || attitude === 0 || quality === 0) {
      alert('请完成所有评分');
      return;
    }

    setSubmitting(true);
    try {
      await createReview(token, taskId, { speed, attitude, quality, comment });
      navigate(`/tasks/${taskId}`, { replace: true });
    } catch (err) {
      alert(err.message || '评价失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page review-page">
      <h2>评价订单</h2>
      <form onSubmit={handleSubmit} className="review-form">
        <div className="review-score-item">
          <label>响应速度</label>
          <StarRating value={speed} onChange={setSpeed} />
        </div>
        <div className="review-score-item">
          <label>服务态度</label>
          <StarRating value={attitude} onChange={setAttitude} />
        </div>
        <div className="review-score-item">
          <label>完成质量</label>
          <StarRating value={quality} onChange={setQuality} />
        </div>

        <div className="quick-comments">
          {QUICK_COMMENTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`quick-tag ${comment === c ? 'active' : ''}`}
              onClick={() => setComment(comment === c ? '' : c)}
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          placeholder="说说你的感受（选填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '提交中...' : '提交评价'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>取消</button>
      </form>
    </div>
  );
}
