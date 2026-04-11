import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { publishTask } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

const CATEGORIES = ['跑腿', '代拿代买', '游戏陪玩', '二手闲置', '失物招领', '校内兼职', '其他'];

export function PublishPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    price: 5,
    pickupText: '',
    deliveryText: '',
    deadlineText: ''
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.pickupText.trim() || !form.deliveryText.trim()) {
      alert('请填写完整的任务信息');
      return;
    }

    setSubmitting(true);
    try {
      await publishTask(token, {
        ...form,
        campus: user?.campus || '东方红校区',
        distanceText: '待计算'
      });
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page publish-page">
      <h2>发布任务</h2>
      <form onSubmit={handleSubmit} className="publish-form">
        <label>任务标题</label>
        <input type="text" placeholder="例如：帮忙取快递送到宿舍" value={form.title} onChange={(e) => update('title', e.target.value)} disabled={submitting} />

        <label>任务类别</label>
        <select value={form.category} onChange={(e) => update('category', e.target.value)} disabled={submitting}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label>任务描述</label>
        <textarea rows={3} placeholder="补充任务要求和注意事项" value={form.description} onChange={(e) => update('description', e.target.value)} disabled={submitting} />

        <label>积分报酬</label>
        <input type="number" min={1} value={form.price} onChange={(e) => update('price', Number(e.target.value))} disabled={submitting} />

        <label>取货/起点</label>
        <input type="text" placeholder="例如：东门菜鸟驿站" value={form.pickupText} onChange={(e) => update('pickupText', e.target.value)} disabled={submitting} />

        <label>送达/终点</label>
        <input type="text" placeholder="例如：6栋宿舍楼" value={form.deliveryText} onChange={(e) => update('deliveryText', e.target.value)} disabled={submitting} />

        <label>截止时间</label>
        <input type="text" placeholder="例如：今天 18:00 前" value={form.deadlineText} onChange={(e) => update('deadlineText', e.target.value)} disabled={submitting} />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '发布中...' : '提交并冻结积分'}
        </button>
      </form>
    </div>
  );
}
