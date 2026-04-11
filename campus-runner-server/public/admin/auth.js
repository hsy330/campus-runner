const ADMIN_TOKEN_KEY = 'campus_runner_admin_token';

function getAdminToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setAdminToken(token) {
  if (token) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: options.headers || getAuthHeaders(),
    ...options
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (response.status === 401) {
    setAdminToken('');
  }

  if (!response.ok) {
    throw new Error(payload.message || payload.error || '请求失败');
  }
  return payload.data;
}
