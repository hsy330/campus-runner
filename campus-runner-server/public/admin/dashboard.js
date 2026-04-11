function createEmptyState(text) {
  const node = document.createElement('div');
  node.className = 'empty-state';
  node.textContent = text;
  return node;
}

function createButton(text, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', async () => {
    try {
      await onClick();
    } catch (error) {
      if (error.message && error.message.includes('过期')) {
        window.location.replace('/admin/login');
        return;
      }
      window.alert(error.message || '操作失败');
    }
  });
  return button;
}

async function requireAdminSession() {
  if (!getAdminToken()) {
    window.location.replace('/admin/login');
    throw new Error('管理员未登录');
  }

  try {
    return await adminRequest('/api/admin/session');
  } catch (error) {
    window.location.replace('/admin/login');
    throw error;
  }
}

async function loadDashboard() {
  const admin = await requireAdminSession();
  document.getElementById('adminIdentity').textContent = `已登录：${admin.name} (${admin.username})`;

  const [words, logs, appeals] = await Promise.all([
    adminRequest('/api/admin/sensitive-words'),
    adminRequest('/api/admin/moderation'),
    adminRequest('/api/admin/appeals')
  ]);

  renderWords(words || []);
  renderLogs(logs || []);
  renderAppeals(appeals || []);
}

function renderWords(words) {
  const container = document.getElementById('wordList');
  container.innerHTML = '';
  if (!words.length) {
    container.appendChild(createEmptyState('暂无敏感词'));
    return;
  }

  words.forEach((word) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    const label = document.createElement('span');
    label.textContent = word;
    chip.appendChild(label);
    chip.appendChild(
      createButton('删除', 'ghost-button', async () => {
        await adminRequest('/api/admin/sensitive-words/remove', {
          method: 'POST',
          body: JSON.stringify({ word })
        });
        await loadDashboard();
      })
    );
    container.appendChild(chip);
  });
}

function renderLogs(logs) {
  const container = document.getElementById('logList');
  container.innerHTML = '';
  if (!logs.length) {
    container.appendChild(createEmptyState('暂无审核日志'));
    return;
  }

  logs.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'stack-item';

    const content = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'stack-title';
    title.textContent = item.contentPreview || '未命名任务';
    const meta = document.createElement('p');
    meta.className = 'stack-meta';
    meta.textContent = `类型：${item.type} · 状态：${item.status}`;
    content.appendChild(title);
    content.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (item.status === 'pending') {
      actions.appendChild(
        createButton('通过', 'ghost-button', async () => {
          await adminRequest(`/api/admin/tasks/${item.targetId}/approve`, { method: 'POST' });
          await loadDashboard();
        })
      );
    }
    if (item.status !== 'removed') {
      actions.appendChild(
        createButton('删除任务', 'danger-button', async () => {
          await adminRequest(`/api/admin/tasks/${item.targetId}/remove`, { method: 'POST' });
          await loadDashboard();
        })
      );
    }

    card.appendChild(content);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function renderAppeals(appeals) {
  const container = document.getElementById('appealList');
  container.innerHTML = '';
  if (!appeals.length) {
    container.appendChild(createEmptyState('暂无申诉工单'));
    return;
  }

  appeals.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'stack-item';

    const content = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'stack-title';
    title.textContent = item.taskTitle || '订单任务';
    const meta = document.createElement('p');
    meta.className = 'stack-meta';
    meta.textContent = `发起人：${item.fromUserName} · 身份：${item.fromRole} · 状态：${item.status}`;
    const reason = document.createElement('p');
    reason.className = 'stack-body';
    reason.textContent = `原因：${item.reason}`;
    const detail = document.createElement('p');
    detail.className = 'stack-body';
    detail.textContent = `说明：${item.detail}`;
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(reason);
    content.appendChild(detail);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (item.status === 'pending') {
      actions.appendChild(
        createButton('处理完成', 'primary-button', async () => {
          await adminRequest(`/api/admin/appeals/${item.id}/resolve`, { method: 'POST' });
          await loadDashboard();
        })
      );
      actions.appendChild(
        createButton('驳回', 'ghost-button', async () => {
          await adminRequest(`/api/admin/appeals/${item.id}/reject`, { method: 'POST' });
          await loadDashboard();
        })
      );
    }

    card.appendChild(content);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

document.getElementById('refreshButton').addEventListener('click', async () => {
  try {
    await loadDashboard();
  } catch (error) {
    window.alert(error.message || '加载失败');
  }
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await adminRequest('/api/admin/logout', { method: 'POST' });
  } catch (error) {
    // ignore logout request failure and clear local token
  } finally {
    setAdminToken('');
    window.location.replace('/admin/login');
  }
});

document.getElementById('addWordButton').addEventListener('click', async () => {
  const input = document.getElementById('newWordInput');
  const word = input.value.trim();
  if (!word) {
    window.alert('请输入敏感词');
    return;
  }

  try {
    await adminRequest('/api/admin/sensitive-words', {
      method: 'POST',
      body: JSON.stringify({ word })
    });
    input.value = '';
    await loadDashboard();
  } catch (error) {
    window.alert(error.message || '新增失败');
  }
});

loadDashboard().catch((error) => {
  if (!error.message || !error.message.includes('未登录')) {
    window.alert(error.message || '后台加载失败');
  }
});
