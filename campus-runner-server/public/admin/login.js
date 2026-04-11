document.getElementById('loginButton').addEventListener('click', async () => {
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!username || !password) {
    window.alert('请输入管理员账号和密码');
    return;
  }

  try {
    const result = await adminRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    setAdminToken(result.token);
    window.location.href = '/admin/dashboard';
  } catch (error) {
    window.alert(error.message || '登录失败');
  }
});

if (getAdminToken()) {
  window.location.replace('/admin/dashboard');
}
