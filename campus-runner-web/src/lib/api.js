const API_BASE_URL = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    method: options.method || 'GET',
    body: options.data ? JSON.stringify(options.data) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || '请求失败');
  }
  return payload.data;
}

export function register(data) {
  return request('/auth/register', { method: 'POST', data });
}

export function login(data) {
  return request('/auth/login', { method: 'POST', data });
}

export function verifyToken(token) {
  return request('/auth/verify', { token });
}

export function updateProfile(token, data) {
  return request('/auth/profile', { method: 'PUT', token, data });
}

export function listTasks(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, value);
    }
  });
  return request(`/tasks${query.toString() ? `?${query.toString()}` : ''}`);
}

export function getTaskDetail(taskId) {
  return request(`/tasks/${taskId}`);
}

export function publishTask(token, data) {
  return request('/tasks', { method: 'POST', token, data });
}

export function acceptTask(token, taskId) {
  return request(`/tasks/${taskId}/accept`, { method: 'POST', token });
}

export function listOrders(token) {
  return request('/orders', { token });
}

export function getProfileBundle(token) {
  return request('/profile/bundle', { token });
}

export function updateTaskStatus(token, taskId, status) {
  return request(`/tasks/${taskId}/status`, { method: 'POST', token, data: { status } });
}

export function createReview(token, taskId, data) {
  return request(`/tasks/${taskId}/review`, { method: 'POST', token, data });
}

export function createAppeal(token, taskId, data) {
  return request(`/tasks/${taskId}/appeal`, { method: 'POST', token, data });
}

export function rechargeWallet(token, amount) {
  return request('/wallet/recharge', { method: 'POST', token, data: { amount } });
}

export function withdrawWallet(token, amount) {
  return request('/wallet/withdraw', { method: 'POST', token, data: { amount } });
}
