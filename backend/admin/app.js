const tokenKey = 'spinach-admin-token';
const rememberedLoginKey = 'spinach-admin-remembered-login';
const state = {
  token: localStorage.getItem(tokenKey) || '',
  view: 'dashboard',
  dashboard: null,
  students: [],
  teachers: [],
  campuses: [],
  courses: [],
  appointments: [],
  accessUsers: [],
  inspectors: [],
  slots: [],
  monthlyHours: [],
  editContext: null
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

function appointmentStatusLabel(value) {
  return {
    booked: '待上课',
    completed: '已完成',
    cancelled: '已取消'
  }[value] || value || '-';
}

function roleLabel(value) {
  return value === 'teacher' ? '老师端' : '学生端';
}

function appointmentSourceLabel(item) {
  if (item.lesson_type === 'trial') return '体验课';
  return item.created_by === 'admin' ? '后台创建' : '学生端预约';
}

function addressStatusLabel(value) {
  return {
    active: '营业中',
    planned: '筹备中',
    inactive: '停用'
  }[value] || value || '-';
}

function modeLabel(value) {
  return value === 'book' ? '按册学习' : '固定课时';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fileToDataUrl(file) {
  if (!file || !file.size) return Promise.resolve('');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('合同附件读取失败'));
    reader.readAsDataURL(file);
  });
}

function renderMetrics(counts = {}) {
  const items = [
    ['学员', counts.students],
    ['老师', counts.teachers],
    ['合同', counts.contracts],
    ['课程绑定', counts.bindings],
    ['预约', counts.appointments],
    ['上课记录', counts.lesson_records],
    ['地址', counts.campuses]
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

function renderStudentStats() {
  const stats = state.dashboard?.studentStats || {};
  el('studentStats').innerHTML = [
    ['在读学员', stats.active],
    ['分期学员', stats.installment],
    ['30天内到期合同', stats.expiring_contracts_30d]
  ].map(([label, value]) => `
    <div class="mini-stat">
      <div class="mini-value">${value ?? 0}</div>
      <div class="mini-label">${label}</div>
    </div>
  `).join('');
}

function renderReleaseInfo() {
  const release = state.dashboard?.release || {};
  el('releaseInfo').innerHTML = `
    <div class="release-line"><strong>${release.tomorrow || '-'}</strong><span class="tag">${release.tomorrow_released ? '已释放' : '20:00 自动释放'}</span></div>
    <div class="muted">${release.note || ''}</div>
  `;
}

function renderCourseStats() {
  const courses = state.dashboard?.courses || [];
  el('courseStatsBody').innerHTML = courses.map((item) => `
    <tr>
      <td>${item.course || '-'}</td>
      <td>${item.binding_count || 0}</td>
      <td>${item.student_count || 0}</td>
      <td>${item.teacher_count || 0}</td>
    </tr>
  `).join('');
}

function renderTodayAppointments() {
  const appointments = state.dashboard?.todayAppointments || [];
  el('todayAppointmentsBody').innerHTML = appointments.map((item) => `
    <tr>
      <td>${item.start_time || '-'}-${item.end_time || '-'}</td>
      <td>${item.student_name || '-'}</td>
      <td>${item.teacher_name || '-'}</td>
      <td>${item.course || '-'}</td>
      <td>${appointmentSourceLabel(item)}</td>
      <td><span class="tag">${appointmentStatusLabel(item.status)}</span></td>
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
      <td><span class="tag">已同步老师端</span></td>
    </tr>
  `).join('');
}

function renderAppointmentSync() {
  el('appointmentSyncBody').innerHTML = state.appointments.map((item) => `
    <tr>
      <td>${item.date || '-'}</td>
      <td>${item.start_time || '-'}-${item.end_time || '-'}</td>
      <td>${item.student_name || '-'}</td>
      <td>${item.teacher_name || '-'}</td>
      <td>${item.course || '-'}</td>
      <td>${appointmentSourceLabel(item) || item.sync_source || '-'}</td>
      <td><span class="tag">${item.synced_to_teacher ? '已同步' : '未绑定'}</span></td>
      <td><span class="tag">${appointmentStatusLabel(item.status)}</span></td>
    </tr>
  `).join('');
}

function renderAccessUsers() {
  el('accessBody').innerHTML = state.accessUsers.map((item) => `
    <tr>
      <td>${roleLabel(item.role)}</td>
      <td>${item.name || item.profile_name || '-'}</td>
      <td>${item.phone || '-'}</td>
      <td>${item.wechat_openid || '-'}</td>
      <td>${item.profile_name || '-'}</td>
      <td>${item.campus_name || '-'}</td>
      <td><span class="tag">${item.status === 'inactive' ? '停用' : '允许访问'}</span></td>
      <td>${item.notes || '-'}</td>
      <td><button type="button" class="link-btn" data-edit="access" data-id="${item.id}">编辑</button></td>
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
      <td>${student.contract_no || '-'}</td>
      <td>${modeLabel(student.mode)}</td>
      <td>${student.completed_lessons ?? '-'}</td>
      <td>${student.remaining_lessons ?? '按册'}</td>
      <td>${student.expires_at || '-'}</td>
      <td><span class="tag">${statusLabel(student.payment_status)}</span></td>
      <td><button type="button" class="link-btn" data-edit="student" data-id="${student.binding_id}">编辑</button></td>
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
      <td><button type="button" class="link-btn" data-edit="teacher" data-id="${teacher.id}">编辑</button></td>
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
      <td><span class="tag">${addressStatusLabel(campus.status || 'active')}</span></td>
      <td>${campus.latitude && campus.longitude ? `${campus.latitude}, ${campus.longitude}` : (campus.map_keyword || '-')}</td>
      <td><button type="button" class="link-btn" data-edit="campus" data-id="${campus.id}">编辑</button></td>
    </tr>
  `).join('');
}

function inputField(name, label, value = '', type = 'text') {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function fileField(name, label, accept = '') {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="file" ${accept ? `accept="${escapeHtml(accept)}"` : ''} />
    </label>
  `;
}

function textAreaField(name, label, value = '') {
  return `
    <label class="span-2">
      <span>${label}</span>
      <textarea name="${name}" rows="2">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function selectField(name, label, value, options) {
  return `
    <label>
      <span>${label}</span>
      <select name="${name}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value ?? '') ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
      </select>
    </label>
  `;
}

function openEditModal(type, item) {
  state.editContext = { type, item };
  el('editMessage').textContent = '';
  const titleMap = {
    student: `编辑学员：${item.name || ''}`,
    teacher: `编辑老师：${item.name || ''}`,
    access: `编辑访问权限：${item.name || item.profile_name || ''}`,
    campus: `编辑门店：${item.name || ''}`
  };
  el('editTitle').textContent = titleMap[type] || '编辑';
  const campusOptions = state.campuses.map((campus) => ({ value: campus.id, label: campus.name }));
  const teacherOptions = state.teachers.map((teacher) => ({ value: teacher.id, label: `${teacher.name} · ${teacher.primary_course || ''}` }));
  const courseOptions = state.courses.map((course) => ({ value: course.name, label: course.name }));
  const fields = {
    student: [
      inputField('name', '姓名', item.name),
      inputField('phone', '资料手机号', item.phone),
      inputField('guardianName', '监护人', item.guardian_name),
      inputField('birthday', '生日', item.birthday, 'date'),
      selectField('campusId', '校区', item.campus_id, campusOptions),
      selectField('teacherId', '绑定老师', item.teacher_id, teacherOptions),
      selectField('course', '乐器项目', item.course, courseOptions),
      selectField('mode', '课程类型', item.mode, [{ value: 'book', label: '按册学习' }, { value: 'fixed20', label: '固定课时' }]),
      inputField('bookLevel', '按册级别', item.book_level),
      inputField('totalLessons', '总课时', item.total_lessons ?? '', 'number'),
      inputField('completedLessons', '已上课时', item.completed_lessons ?? 0, 'number'),
      inputField('enrolledAt', '报名日期', item.enrolled_at, 'date'),
      inputField('expiresAt', '到期日期', item.expires_at, 'date'),
      selectField('paymentStatus', '缴费状态', item.payment_status, [{ value: 'pending', label: '待确认' }, { value: 'paid', label: '已付清' }, { value: 'installment', label: '分期' }, { value: 'trial', label: '体验课' }]),
      selectField('status', '在读状态', item.status, [{ value: 'active', label: '在读' }, { value: 'expired', label: '已到期' }, { value: 'inactive', label: '停用' }, { value: 'trial', label: '体验课' }]),
      inputField('progress', '当前进度', item.progress),
      inputField('contractNo', '合同编号', item.contract_no),
      fileField('attachmentFile', '合同附件', '.pdf,image/*'),
      inputField('attachmentUrl', '合同附件 URL', item.attachment_url),
      textAreaField('notes', '备注', item.notes)
    ],
    teacher: [
      inputField('name', '姓名', item.name),
      inputField('phone', '手机号', item.phone),
      selectField('campusId', '校区', item.campus_id, campusOptions),
      inputField('avatar', '头像 URL', item.avatar),
      selectField('primaryCourse', '主授乐器', item.primary_course, courseOptions),
      inputField('courses', '可授乐器', (item.courses || []).join('、')),
      selectField('status', '状态', item.status, [{ value: 'active', label: '在职' }, { value: 'inactive', label: '停用' }])
    ],
    access: [
      inputField('name', '显示姓名', item.name),
      inputField('phone', '登录手机号', item.phone),
      inputField('wechatOpenid', '微信 OpenID', item.wechat_openid),
      selectField('status', '访问状态', item.status, [{ value: 'active', label: '允许访问' }, { value: 'inactive', label: '停用' }]),
      textAreaField('notes', '备注', item.notes)
    ],
    campus: [
      inputField('name', '校区名称', item.name),
      inputField('shortName', '校区简称', item.short_name),
      inputField('address', '地址', item.address),
      inputField('phone', '电话', item.phone),
      inputField('hours', '营业时间', item.hours),
      inputField('image', '展示图 URL', item.image),
      inputField('releaseTime', '释放时间', item.release_time),
      selectField('status', '状态', item.status || 'active', [{ value: 'active', label: '营业中' }, { value: 'planned', label: '筹备中' }, { value: 'inactive', label: '停用' }]),
      inputField('displayOrder', '排序', item.display_order ?? '', 'number'),
      inputField('latitude', '纬度', item.latitude ?? ''),
      inputField('longitude', '经度', item.longitude ?? ''),
      inputField('contactPerson', '联系人', item.contact_person),
      inputField('mapKeyword', '地图关键词', item.map_keyword),
      textAreaField('desc', '备注', item.desc)
    ]
  }[type] || [];
  el('editFields').innerHTML = fields.join('');
  el('editOverlay').classList.remove('hidden');
}

function closeEditModal() {
  state.editContext = null;
  el('editOverlay').classList.add('hidden');
  el('editFields').innerHTML = '';
  el('editMessage').textContent = '';
}

function findEditable(type, id) {
  if (type === 'student') return state.students.find((item) => item.binding_id === id);
  if (type === 'teacher') return state.teachers.find((item) => item.id === id);
  if (type === 'access') return state.accessUsers.find((item) => item.id === id);
  if (type === 'campus') return state.campuses.find((item) => item.id === id);
  return null;
}

function renderSelects() {
  const teacherOptions = [
    '<option value="">全部老师</option>',
    ...state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name}</option>`)
  ].join('');
  el('studentTeacher').innerHTML = teacherOptions;
  el('appointmentTeacher').innerHTML = teacherOptions;
  document.querySelectorAll('.teacher-select').forEach((select) => {
    select.innerHTML = state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name} · ${teacher.primary_course || ''}</option>`).join('');
  });
  document.querySelectorAll('.campus-select').forEach((select) => {
    select.innerHTML = state.campuses.map((campus) => `<option value="${campus.id}">${campus.name}</option>`).join('');
  });
  document.querySelectorAll('.course-select').forEach((select) => {
    select.innerHTML = state.courses.map((course) => `<option value="${course.name}">${course.name}</option>`).join('');
  });
  el('teacherCourseCheckboxes').innerHTML = state.courses.map((course) => `
    <label class="slot-option">
      <input type="checkbox" name="courses" value="${course.name}" />
      ${course.name}
    </label>
  `).join('');
  renderAccessProfileOptions();
}

function renderAccessProfileOptions() {
  if (!el('accessProfile')) return;
  const seenStudents = new Set();
  const studentOptions = state.students
    .filter((student) => {
      if (!student.student_id || seenStudents.has(student.student_id)) return false;
      seenStudents.add(student.student_id);
      return true;
    })
    .map((student) => `<option value="${student.student_id}" data-role="student">学生 · ${student.name} · ${student.course || ''}</option>`);
  const profileOptions = [
    ...studentOptions,
    ...state.teachers.map((teacher) => `<option value="${teacher.id}" data-role="teacher">老师 · ${teacher.name} · ${teacher.primary_course || ''}</option>`)
  ];
  el('accessProfile').innerHTML = profileOptions.join('');
  el('inspectorStudentProfile').innerHTML = studentOptions.join('');
  el('inspectorTeacherProfile').innerHTML = state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name} · ${teacher.primary_course || ''}</option>`).join('');
  renderInspectors();
}

function renderInspectors() {
  const student = state.inspectors.find((item) => item.role === 'student');
  const teacher = state.inspectors.find((item) => item.role === 'teacher');
  const form = el('inspectorForm');
  if (!form || !student || !teacher) return;
  form.elements.name.value = student.name || teacher.name || '前端巡检';
  form.elements.phone.value = student.phone || teacher.phone || '';
  form.elements.studentProfileId.value = student.profile_id || '';
  form.elements.teacherProfileId.value = teacher.profile_id || '';
  form.elements.studentWechatOpenid.value = student.wechat_openid || '';
  form.elements.teacherWechatOpenid.value = teacher.wechat_openid || '';
  form.elements.status.value = student.status === 'inactive' && teacher.status === 'inactive' ? 'inactive' : 'active';
  form.elements.notes.value = String(student.notes || teacher.notes || '').replace(/：(学生端|老师端)$/, '');
}

function renderSlots() {
  const html = state.slots.map((slot) => `
    <label class="slot-option">
      <input type="checkbox" name="startTimes" value="${slot.startTime}" />
      ${slot.startTime}-${slot.endTime}
    </label>
  `).join('');
  el('fixedSlotCheckboxes').innerHTML = html;
  el('lockSlotCheckboxes').innerHTML = html;
  el('trialStartTime').innerHTML = state.slots.map((slot) => `<option value="${slot.startTime}">${slot.startTime}-${slot.endTime}</option>`).join('');
}

function renderMonthlyHours() {
  el('hoursBody').innerHTML = state.monthlyHours.map((item) => `
    <tr>
      <td>${item.teacher_name || '-'}</td>
      <td>${el('hoursMonth').value || '-'}</td>
      <td>${item.total_lessons || 0}</td>
      <td>${item.valid_lessons || 0}</td>
      <td>${item.invalid_lessons || 0}</td>
      <td><span class="tag">${item.total_lessons ? '待与钉钉月报核对' : '暂无课程记录'}</span></td>
    </tr>
  `).join('');
}

function setView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((node) => node.classList.add('hidden'));
  el(`${view}View`).classList.remove('hidden');
  el('pageTitle').textContent = { dashboard: '总览', students: '学员', teachers: '老师', access: '访问权限', campuses: '地址管理', schedule: '课表', hours: '课时核对', maintenance: '数据维护' }[view];
  el('pageSubtitle').textContent = {
    dashboard: '服务器运行数据',
    students: '按老师、状态和关键词筛选',
    teachers: '老师资料和授课乐器',
    access: '控制谁可以进入学生端或老师端',
    campuses: '门店地址、导航资料和后续新店预留',
    schedule: '固定课节与临时不可约时段',
    hours: '按自然月核对有效课时，再与钉钉考勤月报联动',
    maintenance: '真实数据导入、备份、导出和恢复'
  }[view];
  if (view === 'hours') loadMonthlyHours();
}

async function loadDashboard() {
  state.dashboard = await api('/admin/api/dashboard');
  renderMetrics(state.dashboard.counts);
  renderStudentStats();
  renderReleaseInfo();
  renderCourseStats();
  renderTodayAppointments();
  renderTeacherStats();
  renderAppointments();
}

async function loadCourses() {
  state.courses = await api('/courses');
  renderSelects();
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

async function loadAppointments() {
  const params = new URLSearchParams({
    date: el('appointmentDate').value,
    teacherId: el('appointmentTeacher').value,
    status: el('appointmentStatus').value
  });
  state.appointments = await api(`/admin/api/appointments?${params.toString()}`);
  renderAppointmentSync();
}

async function loadAccessUsers() {
  state.accessUsers = await api('/admin/api/access-users');
  renderAccessUsers();
}

async function loadInspectors() {
  state.inspectors = await api('/admin/api/inspectors');
  renderInspectors();
}

async function loadStudents() {
  const params = new URLSearchParams({
    keyword: el('studentKeyword').value.trim(),
    teacherId: el('studentTeacher').value,
    status: el('studentStatus').value
  });
  state.students = await api(`/admin/api/students?${params.toString()}`);
  renderStudents();
  renderAccessProfileOptions();
}

async function loadMonthlyHours() {
  if (!el('hoursMonth').value) el('hoursMonth').value = new Date().toISOString().slice(0, 7);
  state.monthlyHours = await api(`/stats/teacher-monthly?month=${encodeURIComponent(el('hoursMonth').value)}`);
  renderMonthlyHours();
}

async function loadAll() {
  await loadCourses();
  await loadCampuses();
  await loadTeachers();
  await loadSlots();
  await loadDashboard();
  await loadStudents();
  await loadAppointments();
  await loadAccessUsers();
  await loadInspectors();
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
    if (el('rememberPassword').checked) {
      localStorage.setItem(rememberedLoginKey, JSON.stringify({
        username: el('username').value.trim(),
        password: el('password').value
      }));
    } else {
      localStorage.removeItem(rememberedLoginKey);
    }
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
el('appointmentDate').addEventListener('change', loadAppointments);
el('appointmentTeacher').addEventListener('change', loadAppointments);
el('appointmentStatus').addEventListener('change', loadAppointments);
el('loadHoursBtn').addEventListener('click', loadMonthlyHours);
el('hoursMonth').addEventListener('change', loadMonthlyHours);
el('accessForm').elements.role.addEventListener('change', (event) => {
  const role = event.currentTarget.value;
  const options = [...el('accessProfile').options];
  const matched = options.find((option) => option.dataset.role === role);
  if (matched) el('accessProfile').value = matched.value;
});

el('trialForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('trialFormMessage');
  try {
    const result = await api('/admin/api/trial-appointments', { method: 'POST', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = `体验课已同步到老师课表：${result.date} ${result.start_time}-${result.end_time}`;
    event.currentTarget.reset();
    await loadDashboard();
    await loadAppointments();
    await loadStudents();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('studentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('studentFormMessage');
  try {
    const data = formJson(event.currentTarget);
    const file = event.currentTarget.elements.attachmentFile.files[0];
    delete data.attachmentFile;
    if (file) {
      data.attachmentName = file.name;
      data.attachmentData = await fileToDataUrl(file);
    }
    await api('/admin/api/students', { method: 'POST', body: JSON.stringify(data) });
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
    const form = event.currentTarget;
    const data = formJson(form);
    data.courses = [...form.querySelectorAll('input[name="courses"]:checked')].map((input) => input.value).join('、') || data.primaryCourse;
    await api('/admin/api/teachers', { method: 'POST', body: JSON.stringify(data) });
    message.textContent = '老师已保存';
    event.currentTarget.reset();
    await loadAll();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('accessForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('accessFormMessage');
  const data = formJson(event.currentTarget);
  const selectedProfile = el('accessProfile').selectedOptions[0];
  if (selectedProfile?.dataset.role) data.role = selectedProfile.dataset.role;
  try {
    await api('/admin/api/access-users', { method: 'POST', body: JSON.stringify(data) });
    message.textContent = '访问权限已保存';
    event.currentTarget.reset();
    await loadAccessUsers();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('inspectorForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('inspectorFormMessage');
  try {
    await api('/admin/api/inspectors', { method: 'PATCH', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = '巡检账号已保存';
    await loadAccessUsers();
    await loadInspectors();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('fixedScheduleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formJson(form);
  data.weekdays = [...form.querySelectorAll('input[name="weekdays"]:checked')].map((input) => input.value);
  data.startTimes = [...form.querySelectorAll('input[name="startTimes"]:checked')].map((input) => input.value);
  const message = el('fixedScheduleMessage');
  try {
    const result = await api('/admin/api/fixed-schedule-import', { method: 'POST', body: JSON.stringify(data) });
    message.textContent = `已导入 ${result.count} 天固定课表`;
    await loadDashboard();
    await loadAppointments();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('campusForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('campusFormMessage');
  try {
    await api('/admin/api/campuses', { method: 'POST', body: JSON.stringify(formJson(event.currentTarget)) });
    message.textContent = '地址已保存';
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
    await loadAppointments();
  } catch (error) {
    message.textContent = error.message;
  }
});

el('backupBtn').addEventListener('click', async () => {
  const message = el('backupMessage');
  message.textContent = '正在备份...';
  try {
    const result = await api('/admin/api/backups', { method: 'POST' });
    message.textContent = `备份已生成：${result.backup_path}`;
  } catch (error) {
    message.textContent = error.message;
  }
});

el('exportBtn').addEventListener('click', async () => {
  const message = el('exportMessage');
  message.textContent = '正在导出...';
  try {
    const result = await api('/admin/api/export');
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `spinach-music-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    message.textContent = '导出文件已开始下载';
  } catch (error) {
    message.textContent = error.message;
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit]');
  if (!button) return;
  const item = findEditable(button.dataset.edit, button.dataset.id);
  if (item) openEditModal(button.dataset.edit, item);
});

el('editCloseBtn').addEventListener('click', closeEditModal);
el('editOverlay').addEventListener('click', (event) => {
  if (event.target === el('editOverlay')) closeEditModal();
});

el('editForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const context = state.editContext;
  if (!context) return;
  const message = el('editMessage');
  message.textContent = '正在保存...';
  const data = formJson(event.currentTarget);
  try {
    if (context.type === 'student') {
      const file = event.currentTarget.elements.attachmentFile?.files?.[0];
      delete data.attachmentFile;
      if (file) {
        data.attachmentName = file.name;
        data.attachmentData = await fileToDataUrl(file);
      }
      await api(`/admin/api/students/${context.item.student_id}/bindings/${context.item.binding_id}`, { method: 'PATCH', body: JSON.stringify(data) });
    } else if (context.type === 'teacher') {
      await api(`/admin/api/teachers/${context.item.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    } else if (context.type === 'access') {
      await api(`/admin/api/access-users/${context.item.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    } else if (context.type === 'campus') {
      await api(`/admin/api/campuses/${context.item.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    }
    message.textContent = '已保存';
    await loadAll();
    closeEditModal();
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

(async function boot() {
  let remembered = null;
  try {
    remembered = JSON.parse(localStorage.getItem(rememberedLoginKey) || 'null');
  } catch {
    localStorage.removeItem(rememberedLoginKey);
  }
  if (remembered?.username && remembered?.password) {
    el('username').value = remembered.username;
    el('password').value = remembered.password;
    el('rememberPassword').checked = true;
  }
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
