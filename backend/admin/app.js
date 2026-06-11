const tokenKey = 'spinach-admin-token';
const state = {
  token: localStorage.getItem(tokenKey) || '',
  view: 'dashboard',
  dashboard: null,
  students: [],
  teachers: [],
  campuses: [],
  slots: []
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

function teacherStatusLabel(value) {
  return {
    active: '在职',
    inactive: '停用'
  }[value] || value || '-';
}

function modeLabel(value) {
  return value === 'book' ? '按册学习' : '固定课时';
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
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
      <td><span class="tag">${teacherStatusLabel(teacher.status)}</span></td>
    </tr>
  `).join('');
}

function renderAppointments() {
  const appointments = state.dashboard?.upcomingAppointments || [];
  el('appointmentsBody').innerHTML = appointments.map((item) => `
    <tr>
      <td>${item.date || '-'}</td>
      <td>${item.start_time || '-'}-${item.end_time || '-'}</td>
      <td>${item.student_name || '-'}</td>
      <td>${item.teacher_name || '-'}</td>
      <td>${item.course || '-'}</td>
      <td>${item.campus_name || '-'}</td>
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
      <td><span class="tag">${teacherStatusLabel(teacher.status)}</span></td>
    </tr>
  `).join('');
}

function renderCampuses() {
  el('campusesBody').innerHTML = state.campuses.map((campus) => `
    <tr>
      <td>${campus.name || '-'}</td>
      <td>${campus.short_name || '-'}</td>
      <td>${campus.address || '-'}</td>
      <td>${campus.phone || '-'}</td>
      <td>${campus.hours || '-'}</td>
    </tr>
  `).join('');
}

function renderSelects() {
  const teacherOptions = [
    '<option value="">全部老师</option>',
    ...state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name}</option>`)
  ].join('');
  el('studentTeacher').innerHTML = teacherOptions;
  document.querySelectorAll('.teacher-select').forEach((select) => {
    select.innerHTML = state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name} · ${teacher.primary_course || ''}</option>`).join('');
  });
  document.querySelectorAll('.campus-select').forEach((select) => {
    select.innerHTML = state.campuses.map((campus) => `<option value="${campus.id}">${campus.name}</option>`).join('');
  });
}

function renderSlots() {
  el('slotCheckboxes').innerHTML = state.slots.map((slot) => `
    <label class="slot-option">
      <input type="checkbox" name="startTimes" value="${slot.startTime}" />
      ${slot.startTime}-${slot.endTime}
    </label>
  `).join('');
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((node) => node.classList.add('hidden'));
  el(`${view}View`).classList.remove('hidden');
  el('pageTitle').textContent = { dashboard: '总览', students: '学员', teachers: '老师', campuses: '校区', schedule: '课表' }[view];
  el('pageSubtitle').textContent = {
    dashboard: '服务器运行数据',
    students: '按老师、状态和关键词筛选',
    teachers: '老师资料和授课乐器',
    campuses: '门店地址和导航资料',
    schedule: '固定课节与临时不可约时段'
  }[view];
}

async function loadDashboard() {
  state.dashboard = await api('/admin/api/dashboard');
  renderMetrics(state.dashboard.counts);
  renderTeacherStats();
  renderAppointments();
}

async function loadTeachers() {
  state.teachers = await api('/admin/api/teachers');
  renderSelects();
  renderTeachers();
}

async function loadCampuses() {
  state.campuses = await api('/admin/api/campuses');
  renderSelects();
  renderCampuses();
}

async function loadSlots() {
  state.slots = await api('/admin/api/schedule-slots');
  renderSlots();
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
  await loadCampuses();
  await loadTeachers();
  await loadSlots();
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

el('studentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('studentFormMessage');
  try {
    await api('/admin/api/students', { method: 'POST', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = '学员已保存，并已绑定老师与课程';
    event.currentTarget.reset();
    await loadAll();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('teacherForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('teacherFormMessage');
  try {
    await api('/admin/api/teachers', { method: 'POST', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = '老师已保存';
    event.currentTarget.reset();
    await loadAll();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('campusForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('campusFormMessage');
  try {
    await api('/admin/api/campuses', { method: 'POST', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = '校区已保存';
    event.currentTarget.reset();
    await loadAll();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('lockForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formJson(form);
  data.startTimes = [...form.querySelectorAll('input[name="startTimes"]:checked')].map((input) => input.value);
  const message = el('lockFormMessage');
  try {
    await api('/admin/api/lock-slots', { method: 'POST', body: JSON.stringify(data) });
    message.textContent = '已锁定所选时段，学生端将不可预约';
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
});

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
