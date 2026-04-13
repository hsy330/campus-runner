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

export function cancelTask(token, taskId) {
  return request(`/tasks/${taskId}/cancel`, { method: 'POST', token });
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

export function getPublicProfile(userId) {
  return request(`/profile/${userId}`);
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

export function cancelAppeal(token, taskId) {
  return request(`/tasks/${taskId}/appeal/cancel`, { method: 'POST', token });
}

export function rechargeWallet(token, amount) {
  return request('/wallet/recharge', { method: 'POST', token, data: { amount } });
}

export function withdrawWallet(token, amount) {
  return request('/wallet/withdraw', { method: 'POST', token, data: { amount } });
}

export function searchPlaces(keyword, campus, location) {
  const query = new URLSearchParams({ keyword, campus, limit: 8 });
  if (location?.latitude && location?.longitude) {
    query.set('latitude', location.latitude);
    query.set('longitude', location.longitude);
  }
  return request(`/map/suggestions?${query}`);
}

export function getRouteSummary(from, to) {
  return request('/map/route', { method: 'POST', data: { from, to } });
}

export function reverseGeocode(location, campus) {
  return request('/map/reverse', { method: 'POST', data: { location, campus } });
}

export function listChatRooms(token) {
  return request('/chat/rooms', { token });
}

export function getUnreadCount(token) {
  return request('/chat/unread-count', { token });
}

export function markRoomRead(token, roomId) {
  return request(`/chat/rooms/${roomId}/read`, { method: 'POST', token });
}

export function createChatRoom(token, taskId) {
  return request('/chat/rooms', { method: 'POST', token, data: { taskId } });
}

export function listChatMessages(token, roomId) {
  return request(`/chat/rooms/${roomId}/messages`, { token });
}

export function sendChatMessage(token, roomId, content, type = 'text') {
  return request(`/chat/rooms/${roomId}/messages`, { method: 'POST', token, data: { content, type } });
}

export function adminLogin(username, password) {
  return request('/admin/login', { method: 'POST', data: { username, password } });
}

export function listSensitiveWords(token) {
  return request('/admin/sensitive-words', { token });
}

export function addSensitiveWord(token, word) {
  return request('/admin/sensitive-words', { method: 'POST', token, data: { word } });
}

export function removeSensitiveWord(token, word) {
  return request('/admin/sensitive-words/remove', { method: 'POST', token, data: { word } });
}

export function listModerationLogs(token) {
  return request('/admin/moderation', { token });
}

export function listAdminAppeals(token) {
  return request('/admin/appeals', { token });
}

export function handleAppeal(token, appealId, action) {
  return request(`/admin/appeals/${appealId}/${action}`, { method: 'POST', token });
}

export function settleAppeal(token, appealId, payload) {
  return request(`/admin/appeals/${appealId}/resolve`, { method: 'POST', token, data: payload });
}

export function getBlacklist(token) {
  return request('/blacklist', { token });
}

export function addToBlacklist(token, userId) {
  return request('/blacklist/add', { method: 'POST', token, data: { userId } });
}

export function removeFromBlacklist(token, userId) {
  return request('/blacklist/remove', { method: 'POST', token, data: { userId } });
}

export function sendTip(token, toUserId, amount) {
  return request('/tip', { method: 'POST', token, data: { toUserId, amount } });
}

export function getUserReviews(userId) {
  return request(`/users/${userId}/reviews`);
}

/* ── Admin Extended APIs ── */

export function verifyAdminSession(token) {
  return request('/admin/session', { token });
}

export function getAdminStats(token) {
  return request('/admin/stats', { token });
}

export function listAdminUsers(token, keyword = '', page = 1, pageSize = 20) {
  const query = new URLSearchParams({ keyword, page, pageSize });
  return request(`/admin/users?${query}`, { token });
}

export function banUser(token, userId) {
  return request(`/admin/users/${userId}/ban`, { method: 'POST', token });
}

export function unbanUser(token, userId) {
  return request(`/admin/users/${userId}/unban`, { method: 'POST', token });
}

export function listAdminTasks(token, status = 'all', keyword = '', page = 1, pageSize = 20) {
  const query = new URLSearchParams({ status, keyword, page, pageSize });
  return request(`/admin/tasks?${query}`, { token });
}

export function approveTask(token, taskId) {
  return request(`/admin/tasks/${taskId}/approve`, { method: 'POST', token });
}

export function removeTask(token, taskId) {
  return request(`/admin/tasks/${taskId}/remove`, { method: 'POST', token });
}

export function listAdminOrders(token, page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page, pageSize });
  return request(`/admin/orders?${query}`, { token });
}

export function listAdminWalletFlows(token, page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page, pageSize });
  return request(`/admin/wallet/flows?${query}`, { token });
}

export function listAdminWithdrawals(token, page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page, pageSize });
  return request(`/admin/withdrawals?${query}`, { token });
}

export function approveWithdrawal(token, withdrawalId) {
  return request(`/admin/withdrawals/${withdrawalId}/approve`, { method: 'POST', token });
}

export function rejectWithdrawal(token, withdrawalId) {
  return request(`/admin/withdrawals/${withdrawalId}/reject`, { method: 'POST', token });
}
