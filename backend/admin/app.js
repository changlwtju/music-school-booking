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
  editContext: null,
  selectedAppointmentIds: new Set()
};
let confirmationResolver = null;

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
    const error = new Error(payload.error?.message || '请求失败');
    error.status = response.status;
    throw error;
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
  return {
    student: '学生端',
    teacher: '老师端',
    manager: '管理员端'
  }[value] || value || '-';
}

function appointmentSourceLabel(item) {
  if (item.lesson_type === 'trial') return '体验课';
  if (item.created_by === 'admin') return '后台创建';
  if (String(item.created_by || '').startsWith('manager:')) return '管理员端代约';
  return '学生端预约';
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

function requestSensitiveConfirmation({ title, detail, confirmText = '确认操作', reason = '' }) {
  el('confirmTitle').textContent = title;
  el('confirmDetail').textContent = detail;
  el('confirmSubmitBtn').textContent = confirmText;
  el('confirmPassword').value = '';
  el('confirmReason').value = reason;
  el('confirmReasonField').classList.toggle('hidden', !reason);
  el('confirmOverlay').classList.remove('hidden');
  setTimeout(() => el(reason ? 'confirmReason' : 'confirmPassword').focus(), 0);
  return new Promise((resolve) => {
    confirmationResolver = resolve;
  });
}

function closeSensitiveConfirmation(result = null) {
  el('confirmOverlay').classList.add('hidden');
  const resolve = confirmationResolver;
  confirmationResolver = null;
  if (resolve) resolve(result);
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
  const appointments = state.dashboard?.scheduleAppointments || state.dashboard?.todayAppointments || [];
  el('todayAppointmentsBody').innerHTML = appointments.length ? appointments.map((item) => `
    <tr>
      <td>${item.start_time || '-'}-${item.end_time || '-'}</td>
      <td>${item.student_name || '-'}</td>
      <td>${item.teacher_name || '-'}</td>
      <td>${item.course || '-'}</td>
      <td>${appointmentSourceLabel(item)}</td>
      <td><span class="tag">${appointmentStatusLabel(item.status)}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty-cell">该日期暂无课程安排</td></tr>';
}

function renderAppointments() {
  if (!el('appointmentsBody')) return;
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
      <td class="select-cell">${item.status === 'booked' ? `<input type="checkbox" data-select-appointment="${item.id}" ${state.selectedAppointmentIds.has(item.id) ? 'checked' : ''} aria-label="选择${escapeHtml(item.student_name || '课程')}" />` : ''}</td>
      <td>${item.date || '-'}</td>
      <td>${item.start_time || '-'}-${item.end_time || '-'}</td>
      <td>${item.student_name || '-'}</td>
      <td>${item.teacher_name || '-'}</td>
      <td>${item.course || '-'}</td>
      <td>${appointmentSourceLabel(item) || item.sync_source || '-'}</td>
      <td><span class="tag">${item.synced_to_teacher ? '已同步' : '未绑定'}</span></td>
      <td><span class="tag">${appointmentStatusLabel(item.status)}</span></td>
      <td>${item.status === 'booked' ? `<button type="button" class="table-action danger-action" data-cancel-appointment="${item.id}">取消</button>` : '-'}</td>
    </tr>
  `).join('');
  syncBatchSelectionUi();
}

function syncBatchSelectionUi() {
  const bookedIds = state.appointments.filter((item) => item.status === 'booked').map((item) => item.id);
  state.selectedAppointmentIds = new Set([...state.selectedAppointmentIds].filter((id) => bookedIds.includes(id)));
  const selectedCount = state.selectedAppointmentIds.size;
  el('batchCancelBtn').disabled = !selectedCount;
  el('batchCancelBtn').textContent = selectedCount ? `批量取消所选（${selectedCount}）` : '批量取消所选';
  el('selectAllAppointments').checked = Boolean(bookedIds.length) && bookedIds.every((id) => state.selectedAppointmentIds.has(id));
  el('selectAllAppointments').indeterminate = selectedCount > 0 && selectedCount < bookedIds.length;
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
      <td><button type="button" class="table-action" data-edit="access" data-id="${item.id}">编辑</button></td>
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
      <td><button type="button" class="table-action" data-edit="student" data-id="${student.binding_id}">编辑</button></td>
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
      <td><button type="button" class="table-action" data-edit="teacher" data-id="${teacher.id}">编辑</button></td>
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
      <td><button type="button" class="table-action" data-edit="campus" data-id="${campus.id}">编辑</button></td>
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
    ...state.teachers.map((teacher) => `<option value="${teacher.id}" data-role="teacher">老师 · ${teacher.name} · ${teacher.primary_course || ''}</option>`),
    '<option value="" data-role="manager">管理者 · 无需关联学员或老师档案</option>'
  ];
  el('accessProfile').innerHTML = profileOptions.join('');
  el('inspectorStudentProfile').innerHTML = studentOptions.join('');
  el('inspectorTeacherProfile').innerHTML = state.teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name} · ${teacher.primary_course || ''}</option>`).join('');
  renderInspectors();
}

function renderAdminBookingBindings() {
  const options = state.students
    .filter((student) => student.status === 'active')
    .map((student) => `<option value="${student.student_id}|${student.binding_id}">${student.name} · ${student.course || '-'} · ${student.teacher_name || '-'}</option>`);
  el('adminBookingBinding').innerHTML = options.join('');
  el('batchBookingBinding').innerHTML = options.join('');
}

function syncAdminBookingMode() {
  const isTrial = el('adminBookingType').value === 'trial';
  document.querySelectorAll('.trial-booking-field').forEach((node) => node.classList.toggle('hidden', !isTrial));
  document.querySelectorAll('.regular-booking-field').forEach((node) => node.classList.toggle('hidden', isTrial));
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
      <span>${slot.startTime}<small>${slot.endTime}</small></span>
    </label>
  `).join('');
  el('fixedSlotCheckboxes').innerHTML = html;
  el('lockSlotCheckboxes').innerHTML = html;
  el('adminBookingStartTime').innerHTML = state.slots.map((slot) => `<option value="${slot.startTime}">${slot.startTime}-${slot.endTime}</option>`).join('');
  el('batchBookingStartTime').innerHTML = state.slots.map((slot) => `<option value="${slot.startTime}">${slot.startTime}-${slot.endTime}</option>`).join('');
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
  el('pageTitle').textContent = { dashboard: '总览', students: '学员', teachers: '教务资料', access: '访问权限', schedule: '课表与课时', maintenance: '数据维护' }[view];
  el('pageSubtitle').textContent = {
    dashboard: '服务器运行数据',
    students: '按老师、状态和关键词筛选',
    teachers: '老师资料、授课乐器和门店地址',
    access: '控制谁可以进入学生端或老师端',
    schedule: '约课处理、课表规则和月度课时核对',
    maintenance: '真实数据导入、备份、导出和恢复'
  }[view];
  if (view === 'schedule') loadMonthlyHours();
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function updateDashboardScheduleHeading() {
  const selectedDate = el('dashboardScheduleDate').value;
  const today = localDateValue();
  el('dashboardScheduleTitle').textContent = selectedDate === today ? '今日课表' : `${selectedDate || today} 课表`;
}

async function loadDashboard() {
  if (!el('dashboardScheduleDate').value) el('dashboardScheduleDate').value = localDateValue();
  const date = el('dashboardScheduleDate').value;
  state.dashboard = await api(`/admin/api/dashboard?date=${encodeURIComponent(date)}`);
  renderMetrics(state.dashboard.counts);
  renderStudentStats();
  renderReleaseInfo();
  renderCourseStats();
  renderTodayAppointments();
  renderTeacherStats();
  renderAppointments();
  updateDashboardScheduleHeading();
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
    studentKeyword: el('appointmentStudentKeyword').value.trim(),
    teacherId: el('appointmentTeacher').value,
    status: el('appointmentStatus').value
  });
  state.appointments = await api(`/admin/api/appointments?${params.toString()}`);
  state.selectedAppointmentIds.clear();
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
  renderAdminBookingBindings();
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
el('dashboardScheduleDate').addEventListener('change', loadDashboard);
el('dashboardTodayBtn').addEventListener('click', () => {
  el('dashboardScheduleDate').value = localDateValue();
  loadDashboard();
});
function stepDashboardDate(days) {
  const current = new Date(`${el('dashboardScheduleDate').value || localDateValue()}T12:00:00`);
  current.setDate(current.getDate() + days);
  el('dashboardScheduleDate').value = localDateValue(current);
  loadDashboard();
}
el('dashboardPreviousDate').addEventListener('click', () => stepDashboardDate(-1));
el('dashboardNextDate').addEventListener('click', () => stepDashboardDate(1));
el('studentKeyword').addEventListener('input', () => loadStudents());
el('studentTeacher').addEventListener('change', loadStudents);
el('studentStatus').addEventListener('change', loadStudents);
el('appointmentDate').addEventListener('change', loadAppointments);
el('appointmentStudentKeyword').addEventListener('input', loadAppointments);
el('appointmentTeacher').addEventListener('change', loadAppointments);
el('appointmentStatus').addEventListener('change', loadAppointments);
el('selectAllAppointments').addEventListener('change', (event) => {
  state.selectedAppointmentIds.clear();
  if (event.currentTarget.checked) {
    state.appointments.filter((item) => item.status === 'booked').forEach((item) => state.selectedAppointmentIds.add(item.id));
  }
  renderAppointmentSync();
});
el('batchCancelBtn').addEventListener('click', async () => {
  const selected = state.appointments.filter((item) => state.selectedAppointmentIds.has(item.id));
  if (!selected.length) return;
  const names = [...new Set(selected.map((item) => item.student_name))];
  const confirmation = await requestSensitiveConfirmation({
    title: '确认批量取消课程',
    detail: `将取消 ${selected.length} 节待上课课程，包含 ${names.slice(0, 4).join('、')}${names.length > 4 ? '等学员' : ''}。`,
    confirmText: `确认取消 ${selected.length} 节`,
    reason: '后台批量取消'
  });
  if (!confirmation) return;
  try {
    const result = await api('/admin/api/appointments/batch-cancel', {
      method: 'POST',
      body: JSON.stringify({
        appointmentIds: selected.map((item) => item.id),
        reason: confirmation.reason,
        confirmationPassword: confirmation.password
      })
    });
    window.alert(`批量取消完成：成功 ${result.cancelled.length} 节，跳过 ${result.skipped.length} 节`);
    state.selectedAppointmentIds.clear();
    await loadDashboard();
    await loadAppointments();
  } catch (error) {
    window.alert(error.message);
  }
});
el('loadHoursBtn').addEventListener('click', loadMonthlyHours);
el('hoursMonth').addEventListener('change', loadMonthlyHours);
el('accessForm').elements.role.addEventListener('change', (event) => {
  const role = event.currentTarget.value;
  const options = [...el('accessProfile').options];
  const matched = options.find((option) => option.dataset.role === role);
  if (matched) el('accessProfile').value = matched.value;
});

el('adminBookingType').addEventListener('change', syncAdminBookingMode);

el('adminBookingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = el('adminBookingMessage');
  try {
    const isTrial = el('adminBookingType').value === 'trial';
    const data = formJson(event.currentTarget);
    const studentLabel = isTrial
      ? (data.studentName || '体验学员')
      : (el('adminBookingBinding').selectedOptions[0]?.textContent || '所选学员');
    const confirmation = await requestSensitiveConfirmation({
      title: isTrial ? '确认创建体验课' : '确认后台代约',
      detail: `${studentLabel}，${data.date} ${data.startTime}。提交后会立即占用老师课表。`,
      confirmText: '确认并创建课程'
    });
    if (!confirmation) return;
    data.confirmationPassword = confirmation.password;
    let result;
    if (isTrial) {
      data.notes = data.note;
      result = await api('/admin/api/trial-appointments', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = `体验课已同步老师课表：${result.date} ${result.start_time}-${result.end_time}`;
    } else {
      const [studentId, bindingId] = String(data.studentBinding || '').split('|');
      delete data.studentBinding;
      data.studentId = studentId;
      data.bindingId = bindingId;
      result = await api('/admin/api/appointments', { method: 'POST', body: JSON.stringify(data) });
      message.textContent = `正式课已同步老师课表：${result.date} ${result.start_time}-${result.end_time}`;
    }
    event.currentTarget.reset();
    syncAdminBookingMode();
    await loadDashboard();
    await loadAppointments();
    await loadStudents();
  } catch (error) {
    message.textContent = error.message;
    if (error.status === 409) window.alert(`无法预约：${error.message}`);
  }
});

el('batchBookingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = el('batchBookingMessage');
  const results = el('batchBookingResults');
  const data = formJson(form);
  const [studentId, bindingId] = String(data.studentBinding || '').split('|');
  data.studentId = studentId;
  data.bindingId = bindingId;
  delete data.studentBinding;
  data.weekdays = [...form.querySelectorAll('input[name="weekdays"]:checked')].map((input) => input.value);
  if (!data.weekdays.length) {
    message.textContent = '请至少选择一个预约星期';
    return;
  }
  const studentLabel = el('batchBookingBinding').selectedOptions[0]?.textContent || '所选学员';
  const confirmation = await requestSensitiveConfirmation({
    title: '确认批量预约',
    detail: `${studentLabel}，${data.startDate} 至 ${data.endDate}，固定时段 ${data.startTime}。冲突日期会跳过，其余日期立即创建。`,
    confirmText: '确认批量预约'
  });
  if (!confirmation) return;
  data.confirmationPassword = confirmation.password;
  try {
    const result = await api('/admin/api/appointments/batch', { method: 'POST', body: JSON.stringify(data) });
    message.textContent = `共处理 ${result.requested} 个日期，成功 ${result.created.length} 个，跳过 ${result.conflicts.length} 个`;
    results.classList.remove('hidden');
    results.innerHTML = `
      ${result.created.length ? `<div class="batch-result success-result"><strong>预约成功</strong><span>${result.created.map((item) => `${item.date} ${item.start_time}`).join('、')}</span></div>` : ''}
      ${result.conflicts.length ? `<div class="batch-result conflict-result"><strong>未预约</strong>${result.conflicts.map((item) => `<span>${escapeHtml(item.date)}：${escapeHtml(item.message)}</span>`).join('')}</div>` : ''}
    `;
    await loadDashboard();
    await loadAppointments();
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
  if (data.role !== 'manager' && selectedProfile?.dataset.role) data.role = selectedProfile.dataset.role;
  if (data.role === 'manager') data.profileId = '';
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
  el('backupBtn').disabled = true;
  try {
    const result = await api('/admin/api/backups', { method: 'POST' });
    message.textContent = `备份已生成：${result.backup_path}`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    el('backupBtn').disabled = false;
  }
});

el('exportBtn').addEventListener('click', async () => {
  const message = el('exportMessage');
  message.textContent = '正在导出...';
  el('exportBtn').disabled = true;
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
  } finally {
    el('exportBtn').disabled = false;
  }
});

document.addEventListener('click', (event) => {
  const appointmentCheckbox = event.target.closest('[data-select-appointment]');
  if (appointmentCheckbox) {
    if (appointmentCheckbox.checked) state.selectedAppointmentIds.add(appointmentCheckbox.dataset.selectAppointment);
    else state.selectedAppointmentIds.delete(appointmentCheckbox.dataset.selectAppointment);
    syncBatchSelectionUi();
    return;
  }
  const cancelButton = event.target.closest('[data-cancel-appointment]');
  if (cancelButton) {
    const appointment = state.appointments.find((item) => item.id === cancelButton.dataset.cancelAppointment);
    requestSensitiveConfirmation({
      title: '确认取消课程',
      detail: `${appointment?.student_name || '该学员'}，${appointment?.date || ''} ${appointment?.start_time || ''}-${appointment?.end_time || ''}。取消后该时段会重新释放。`,
      confirmText: '确认取消课程',
      reason: '后台取消'
    }).then((confirmation) => {
      if (!confirmation) return;
      api(`/admin/api/appointments/${cancelButton.dataset.cancelAppointment}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: confirmation.reason,
          confirmationPassword: confirmation.password
        })
      }).then(async () => {
        await loadDashboard();
        await loadAppointments();
      }).catch((error) => {
        window.alert(error.message);
      });
    });
    return;
  }
  const button = event.target.closest('[data-edit]');
  if (!button) return;
  const item = findEditable(button.dataset.edit, button.dataset.id);
  if (item) openEditModal(button.dataset.edit, item);
});

el('editCloseBtn').addEventListener('click', closeEditModal);
el('editOverlay').addEventListener('click', (event) => {
  if (event.target === el('editOverlay')) closeEditModal();
});
el('confirmCancelBtn').addEventListener('click', () => closeSensitiveConfirmation());
el('confirmOverlay').addEventListener('click', (event) => {
  if (event.target === el('confirmOverlay')) closeSensitiveConfirmation();
});
el('confirmForm').addEventListener('submit', (event) => {
  event.preventDefault();
  closeSensitiveConfirmation({
    password: el('confirmPassword').value,
    reason: el('confirmReason').value.trim()
  });
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
  syncAdminBookingMode();
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
