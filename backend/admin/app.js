const tokenKey = 'spinach-admin-token';
const state = {
  token: localStorage.getItem(tokenKey) || '',
  view: 'dashboard',
  dashboard: null,
  students: [],
  teachers: []
};

const el = (id) => document.getElementById(id);

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(payload.error?.message || '请求失败');
  }
  return payload.data;
}

function showLogin(message = '') {
  state.token = '';
  localStorage.removeItem(tokenKey);
  el('loginView').classList.remove('hidden');
  el('appView').classList.add('hidden');
  el('loginError').textContent = message;
}

function showApp() {
  el('loginView').classList.add('hidden');
  el('appView').classList.remove('hidden');
}

function statusLabel(value) {
  return {
    active: '在读',
    inactive: '停用',
    expired: '已到期',
    trial: '体验课',
    paid: '已付清',
    installment: '分期',
    pending: '待确认'
  }[value] || value || '-';
}

function modeLabel(value) {
  return value === 'book' ? '按册学习' : '固定课时';
}

function renderMetrics(counts = {}) {
  const items = [
    ['学员', counts.students],
    ['老师', counts.teachers],
    ['合同', counts.contracts],
    ['课程绑定', counts.bindings],
    ['预约', counts.appointments],
    ['上课记录', counts.lesson_records],
    ['校区', counts.campuses]
  ];
  el('metrics').innerHTML = items.map(([label, value]) => `
    <div class="metric">
      <div class="metric-value">${value ?? 0}</div>
      <div class="metric-label">${label}</div>
    </div>
  `).join('');
}

function renderTeacherStats() {
  const teachers = state.dashboard?.teachers || [];
  el('teacherStatsBody').innerHTML = teachers.map((teacher) => `
    <tr>
      <td>${teacher.name}</td>
      <td>${teacher.course || '-'}</td>
      <td>${teacher.student_count}</td>
      <td>${teacher.binding_count}</td>
      <td>${teacher.booked_count}</td>
      <td><span class="tag">${statusLabel(teacher.status)}</span></td>
    </tr>
  `).join('');
}

function renderStudents() {
  el('studentsBody').innerHTML = state.students.map((student) => `
    <tr>
      <td>${student.name || '-'}</td>
      <td>${student.phone || '-'}</td>
      <td>${student.teacher_name || '-'}</td>
      <td>${student.course || '-'}</td>
      <td>${modeLabel(student.mode)}</td>
      <td>${student.completed_lessons ?? '-'}</td>
      <td>${student.remaining_lessons ?? '按册'}</td>
      <td>${student.expires_at || '-'}</td>
      <td><span class="tag">${statusLabel(student.payment_status)}</span></td>
    </tr>
  `).join('');
}

function renderTeachers() {
  el('teachersBody').innerHTML = state.teachers.map((teacher) => `
    <tr>
      <td>${teacher.name}</td>
      <td>${teacher.campus_name || '-'}</td>
      <td>${teacher.phone || '-'}</td>
      <td>${teacher.primary_course || '-'}</td>
      <td>${(teacher.courses || []).join('、') || '-'}</td>
      <td>${teacher.student_count}</td>
      <td><span class="tag">${statusLabel(teacher.status)}</span></td>
    </tr>
  `).join('');
}

function renderTeacherFilter() {
  el('studentTeacher').innerHTML = [
    '<option value="">全部老师</option>',
    ...state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name}</option>`)
  ].join('');
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((node) => node.classList.add('hidden'));
  el(`${view}View`).classList.remove('hidden');
  el('pageTitle').textContent = { dashboard: '总览', students: '学员', teachers: '老师' }[view];
  el('pageSubtitle').textContent = {
    dashboard: '服务器运行数据',
    students: '按老师、状态和关键词筛选',
    teachers: '老师资料和学员数量'
  }[view];
}

async function loadDashboard() {
  state.dashboard = await api('/admin/api/dashboard');
  renderMetrics(state.dashboard.counts);
  renderTeacherStats();
}

async function loadTeachers() {
  state.teachers = await api('/admin/api/teachers');
  renderTeacherFilter();
  renderTeachers();
}

async function loadStudents() {
  const params = new URLSearchParams({
    keyword: el('studentKeyword').value.trim(),
    teacherId: el('studentTeacher').value,
    status: el('studentStatus').value
  });
  state.students = await api(`/admin/api/students?${params.toString()}`);
  renderStudents();
}

async function loadAll() {
  await loadTeachers();
  await loadDashboard();
  await loadStudents();
}

el('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  el('loginError').textContent = '';
  try {
    const result = await api('/admin/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: el('username').value.trim(),
        password: el('password').value
      })
    });
    state.token = result.token;
    localStorage.setItem(tokenKey, state.token);
    showApp();
    await loadAll();
  } catch (error) {
    el('loginError').textContent = error.message;
  }
});

el('logoutBtn').addEventListener('click', async () => {
  try {
    await api('/admin/api/logout', { method: 'POST' });
  } catch {
    // Logging out should always clear the browser session.
  }
  showLogin();
});

el('refreshBtn').addEventListener('click', loadAll);
el('studentKeyword').addEventListener('input', () => loadStudents());
el('studentTeacher').addEventListener('change', loadStudents);
el('studentStatus').addEventListener('change', loadStudents);

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

(async function boot() {
  if (!state.token) {
    showLogin();
    return;
  }
  try {
    await api('/admin/api/me');
    showApp();
    await loadAll();
  } catch {
    showLogin('登录已过期，请重新登录');
  }
}());
