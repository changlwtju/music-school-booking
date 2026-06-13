import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'spinach-music.json');

export const courseCatalog = [
  { id: 'course-piano', name: '钢琴', icon: '🎹', iconClass: 'piano', desc: '启蒙、考级与作品练习' },
  { id: 'course-guitar', name: '吉他', icon: '🎸', iconClass: 'guitar', desc: '弹唱、和弦与节奏训练' },
  { id: 'course-electric-guitar', name: '电吉他', icon: '🎸', iconClass: 'guitar', desc: '音色、riff 与节奏训练' },
  { id: 'course-drum', name: '架子鼓', icon: '🥁', iconClass: 'drum', desc: '节拍、律动与乐队配合' }
];

export function createInitialData() {
  const now = new Date().toISOString();
  const today = localDate(0);
  const tomorrow = localDate(1);
  const yesterday = localDate(-1);
  return {
    courses: courseCatalog,
    campuses: [
      {
        id: 'campus-2d2207a805',
        name: '菠菜现代音乐一店（净月御翠园）',
        short_name: '一店',
        address: '长春市净月区御翠园小区别墅区',
        phone: '请联系校区老师',
        latitude: null,
        longitude: null,
        hours: '周二至周日 12:00-20:00',
        image: '/assets/brand/brand-display.jpg',
        release_time: '20:00',
        desc: '原表校区名称：一店御翠园店；二店资料待补充',
        status: 'active',
        display_order: 1,
        contact_person: '',
        map_keyword: '长春市净月区御翠园小区别墅区'
      },
      {
        id: 'campus-54c723ed85',
        name: '菠菜现代音乐二店（融创上城）',
        short_name: '二店',
        address: '长春市高新区融创上城二期别墅区',
        phone: '请联系校区老师',
        latitude: null,
        longitude: null,
        hours: '周二至周日 12:00-20:00',
        image: '/assets/brand/brand-display.jpg',
        release_time: '20:00',
        desc: '二店位于融创上城二期别墅区',
        status: 'active',
        display_order: 2,
        contact_person: '',
        map_keyword: '长春市高新区融创上城二期别墅区'
      }
    ],
    users: [
      { id: 'user-teacher-695b7e061b', openid: 'demo-teacher-695b7e061b', name: '刘芗齐', phone: '', role: 'teacher', status: 'active' },
      { id: 'user-teacher-c823a14da0', openid: 'demo-teacher-c823a14da0', name: '闻俊浩', phone: '', role: 'teacher', status: 'active' },
      { id: 'user-student-a4e31feaf1', openid: 'demo-student-a4e31feaf1', name: '唐鹏', phone: '', role: 'student', status: 'active' },
      { id: 'user-student-19ae2b74d3', openid: 'demo-student-19ae2b74d3', name: '薛冬瑞', phone: '', role: 'student', status: 'active' }
    ],
    accessUsers: [
      { id: 'access-inspector-student', role: 'student', profile_id: 'student-a4e31feaf1', name: '前端巡检', phone: '13800000010', status: 'active', notes: '前端巡检账号：学生端' },
      { id: 'access-inspector-teacher', role: 'teacher', profile_id: 'teacher-695b7e061b', name: '前端巡检', phone: '13800000010', status: 'active', notes: '前端巡检账号：老师端' },
      { id: 'access-teacher-695b7e061b', role: 'teacher', profile_id: 'teacher-695b7e061b', name: '刘芗齐', phone: '', status: 'active', notes: '默认老师端访问权限' },
      { id: 'access-teacher-c823a14da0', role: 'teacher', profile_id: 'teacher-c823a14da0', name: '闻俊浩', phone: '', status: 'active', notes: '默认老师端访问权限' },
      { id: 'access-student-a4e31feaf1', role: 'student', profile_id: 'student-a4e31feaf1', name: '唐鹏', phone: '', status: 'active', notes: '默认学生端访问权限' },
      { id: 'access-student-19ae2b74d3', role: 'student', profile_id: 'student-19ae2b74d3', name: '薛冬瑞', phone: '', status: 'active', notes: '默认学生端访问权限' }
    ],
    students: [
      { id: 'student-a4e31feaf1', user_id: 'user-student-a4e31feaf1', campus_id: 'campus-2d2207a805', name: '唐鹏', phone: '', avatar: '/assets/brand/avatar.png', enrolled_at: '2026-03-22', expires_at: '2027-03-22', payment_status: 'pending', status: 'active', notes: '报名有效期一年；按册学习；完成课程记录后计入当节有效课时。' },
      { id: 'student-19ae2b74d3', user_id: 'user-student-19ae2b74d3', campus_id: 'campus-2d2207a805', name: '薛冬瑞', phone: '', avatar: '/assets/brand/avatar.png', enrolled_at: '2026-05-29', expires_at: '2027-05-29', payment_status: 'pending', status: 'active', notes: '电吉他课程。' }
    ],
    teachers: [
      { id: 'teacher-695b7e061b', user_id: 'user-teacher-695b7e061b', campus_id: 'campus-2d2207a805', name: '刘芗齐', phone: '', avatar: '/assets/brand/avatar.png', primary_course: '钢琴', courses: ['钢琴'], status: 'active' },
      { id: 'teacher-c823a14da0', user_id: 'user-teacher-c823a14da0', campus_id: 'campus-2d2207a805', name: '闻俊浩', phone: '', avatar: '/assets/brand/avatar.png', primary_course: '吉他', courses: ['吉他', '电吉他'], status: 'active' }
    ],
    contracts: [
      { id: 'contract-80ea18d164', contract_no: 'DEMO-80EA18D164', student_id: 'student-a4e31feaf1', campus_id: 'campus-2d2207a805', course: '钢琴', mode: 'book', book_level: '', total_lessons: null, completed_lessons: 0, valid_lessons: 0, invalid_lessons: 0, progress: '', signed_at: '2026-03-22', expires_at: '2027-03-22', status: 'active', attachment_url: '' },
      { id: 'contract-9dbc6ae688', contract_no: 'DEMO-9DBC6AE688', student_id: 'student-19ae2b74d3', campus_id: 'campus-2d2207a805', course: '电吉他', mode: 'book', book_level: '', total_lessons: null, completed_lessons: 0, valid_lessons: 0, invalid_lessons: 0, progress: '', signed_at: '2026-05-29', expires_at: '2027-05-29', status: 'active', attachment_url: '' }
    ],
    bindings: [
      { id: 'binding-80ea18d164', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', status: 'active', created_at: now },
      { id: 'binding-9dbc6ae688', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', status: 'active', created_at: now }
    ],
    appointments: [
      { id: 'appt-yesterday-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: yesterday, start_time: '15:00', end_time: '15:45', status: 'completed', lesson_note: '复习基础手型，巩固右手触键。', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-today-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: today, start_time: '13:30', end_time: '14:15', status: 'booked', lesson_note: '右手五指练习与节奏稳定。', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-tomorrow-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: tomorrow, start_time: '15:45', end_time: '16:30', status: 'booked', lesson_note: '识谱与双手协调预习。', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-yesterday-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: yesterday, start_time: '18:30', end_time: '19:15', status: 'completed', lesson_note: '复习拨片控制和开放和弦。', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-today-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: today, start_time: '18:30', end_time: '19:15', status: 'booked', lesson_note: '八分音符 riff 与失真音色控制。', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-tomorrow-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: tomorrow, start_time: '17:45', end_time: '18:30', status: 'booked', lesson_note: '分解节奏与歌曲段落衔接。', created_at: now, updated_at: now, cancel_reason: '' }
    ],
    teacherAvailability: [],
    lessonRecords: [
      { id: 'record-yesterday-piano-tang', appointment_id: 'appt-yesterday-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: yesterday, start_time: '15:00', end_time: '15:45', status: 'completed', billable: 1, difficulty: '适中', progress: '基础手型与右手触键', homework: '每天 10 分钟右手五指练习', content: '复习坐姿和手型，练习右手五指连贯触键。', notes: '', created_at: now },
      { id: 'record-yesterday-guitar-xue', appointment_id: 'appt-yesterday-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: yesterday, start_time: '18:30', end_time: '19:15', status: 'completed', billable: 1, difficulty: '适中', progress: '拨片控制与开放和弦', homework: '慢速练习下拨和上拨各 20 组', content: '复习拨片握法，练习开放和弦切换和基本节奏型。', notes: '', created_at: now }
    ]
  };
}

function localDate(offset = 0) {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadStore() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const data = createInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return data;
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const pruned = pruneLegacyDemoData(data);
  const enriched = enrichSparseSchedule(data);
  const inspectorReady = ensureInspectorAccess(data);
  const managerReady = ensureManagerAccess(data);
  const campusReady = ensureCampusDetails(data);
  if (pruned || enriched || inspectorReady || managerReady || campusReady) saveStore(data);
  return data;
}

export function saveStore(store) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

export const store = loadStore();

function ensureCampusDetails(data) {
  const secondCampus = (data.campuses || []).find((item) => item.short_name === '二店' || String(item.name || '').includes('融创上城'));
  let changed = false;
  for (const campus of data.campuses || []) {
    const before = JSON.stringify(campus);
    if (campus.image === '/assets/brand/brand-display.png') campus.image = '/assets/brand/brand-display.jpg';
    changed = changed || before !== JSON.stringify(campus);
  }
  if (!secondCampus) return changed;
  const address = '长春市高新区融创上城二期别墅区';
  const before = JSON.stringify(secondCampus);
  if (!secondCampus.address || secondCampus.address.includes('待')) secondCampus.address = address;
  if (!secondCampus.map_keyword || secondCampus.map_keyword.includes('待')) secondCampus.map_keyword = address;
  if (!secondCampus.desc || secondCampus.desc.includes('待补充')) secondCampus.desc = '二店位于融创上城二期别墅区';
  return changed || before !== JSON.stringify(secondCampus);
}

function ensureInspectorAccess(data) {
  data.accessUsers ||= [];
  const firstStudent = (data.students || []).find((item) => item.status === 'active') || (data.students || [])[0];
  const firstTeacher = (data.teachers || []).find((item) => item.status === 'active') || (data.teachers || [])[0];
  let changed = false;
  const upsertAccess = (item) => {
    const existing = data.accessUsers.find((entry) => entry.id === item.id);
    if (existing) {
      const before = JSON.stringify(existing);
      existing.role = item.role;
      existing.profile_id ||= item.profile_id;
      existing.name = item.name;
      existing.phone = item.phone;
      existing.status ||= item.status;
      existing.notes ||= item.notes;
      changed = changed || before !== JSON.stringify(existing);
    } else {
      data.accessUsers.push(item);
      changed = true;
    }
  };
  if (firstStudent) {
    upsertAccess({
      id: 'access-inspector-student',
      role: 'student',
      profile_id: firstStudent.id,
      name: '前端巡检',
      phone: '13800000010',
      wechat_openid: '',
      status: 'active',
      notes: '前端巡检账号：学生端'
    });
  }
  if (firstTeacher) {
    upsertAccess({
      id: 'access-inspector-teacher',
      role: 'teacher',
      profile_id: firstTeacher.id,
      name: '前端巡检',
      phone: '13800000010',
      wechat_openid: '',
      status: 'active',
      notes: '前端巡检账号：老师端'
    });
  }
  return changed;
}

function ensureManagerAccess(data) {
  data.accessUsers ||= [];
  const managers = [
    { id: 'access-manager-zhu-yunsheng', legacyIds: ['access-manager-zhu-yuanxin'], name: '朱云笙', phone: '16724456666', notes: '门店管理者；管理者端代约、取消及巡检账号' },
    { id: 'access-manager-liu-jiwen', name: '刘继文', phone: '15604414117', notes: '门店管理者；管理者端代约、取消及巡检账号' },
    { id: 'access-manager-wang-jinwu', name: '王金武', phone: '18543171304', notes: '门店管理者；管理者端代约、取消及巡检账号' },
    { id: 'access-manager-chang-liwen', name: '常立文', phone: '18222288952', notes: '开发者；管理者端功能巡检账号' }
  ];
  let changed = false;
  for (const manager of managers) {
    const existing = data.accessUsers.find((item) => (
      item.id === manager.id
      || manager.legacyIds?.includes(item.id)
      || (item.role === 'manager' && item.phone === manager.phone)
    ));
    if (existing) {
      const before = JSON.stringify(existing);
      existing.id = manager.id;
      existing.role = 'manager';
      existing.profile_id = '';
      existing.name = manager.name;
      existing.phone = manager.phone;
      existing.wechat_openid ||= '';
      existing.status ||= 'active';
      existing.notes ||= manager.notes;
      changed = changed || before !== JSON.stringify(existing);
    } else {
      data.accessUsers.push({
        id: manager.id,
        name: manager.name,
        phone: manager.phone,
        notes: manager.notes,
        role: 'manager',
        profile_id: '',
        wechat_openid: '',
        status: 'active'
      });
      changed = true;
    }
  }
  return changed;
}

function pruneLegacyDemoData(data) {
  const legacyTeacherIds = new Set(['teacher-lin', 'teacher-qiao', 'teacher-sun']);
  const legacyTeacherNames = new Set(['林老师', '乔老师', '孙老师', '刘老师']);
  const legacyStudentIds = new Set(['student-chen', 'student-wang', 'student-li']);
  const legacyStudentNames = new Set(['陈小雨', '王一诺', '李可', '小菠菜']);
  const legacyCampusIds = new Set(['campus-main', 'campus-east']);
  const before = JSON.stringify({
    campuses: data.campuses,
    users: data.users,
    students: data.students,
    teachers: data.teachers,
    contracts: data.contracts,
    bindings: data.bindings,
    appointments: data.appointments,
    lessonRecords: data.lessonRecords,
    teacherAvailability: data.teacherAvailability
  });

  const teacherIds = new Set((data.teachers || [])
    .filter((item) => legacyTeacherIds.has(item.id) || legacyTeacherNames.has(item.name))
    .map((item) => item.id));
  const teacherUserIds = new Set((data.teachers || [])
    .filter((item) => teacherIds.has(item.id))
    .map((item) => item.user_id));
  const studentIds = new Set((data.students || [])
    .filter((item) => legacyStudentIds.has(item.id) || legacyStudentNames.has(item.name))
    .map((item) => item.id));
  const studentUserIds = new Set((data.students || [])
    .filter((item) => studentIds.has(item.id))
    .map((item) => item.user_id));
  data.teachers = (data.teachers || []).filter((item) => !teacherIds.has(item.id));
  data.students = (data.students || []).filter((item) => !studentIds.has(item.id));
  data.users = (data.users || []).filter((item) => !teacherUserIds.has(item.id) && !studentUserIds.has(item.id) && !legacyStudentNames.has(item.name));
  const removedContractIds = new Set((data.bindings || [])
    .filter((item) => teacherIds.has(item.teacher_id) || studentIds.has(item.student_id))
    .map((item) => item.contract_id));
  data.bindings = (data.bindings || []).filter((item) => !teacherIds.has(item.teacher_id) && !studentIds.has(item.student_id));
  data.contracts = (data.contracts || []).filter((item) => !studentIds.has(item.student_id) && !removedContractIds.has(item.id));
  data.appointments = (data.appointments || []).filter((item) => !teacherIds.has(item.teacher_id) && !studentIds.has(item.student_id));
  data.lessonRecords = (data.lessonRecords || []).filter((item) => !teacherIds.has(item.teacher_id) && !studentIds.has(item.student_id));
  data.teacherAvailability = (data.teacherAvailability || []).filter((item) => !teacherIds.has(item.teacher_id));
  data.campuses = (data.campuses || []).filter((item) => !legacyCampusIds.has(item.id));

  return before !== JSON.stringify({
    campuses: data.campuses,
    users: data.users,
    students: data.students,
    teachers: data.teachers,
    contracts: data.contracts,
    bindings: data.bindings,
    appointments: data.appointments,
    lessonRecords: data.lessonRecords,
    teacherAvailability: data.teacherAvailability
  });
}

function enrichSparseSchedule(data) {
  data.appointments ||= [];
  data.lessonRecords ||= [];
  const activeBindings = (data.bindings || []).filter((binding) => binding.status === 'active');
  const teacherIds = new Set(activeBindings.map((binding) => binding.teacher_id));
  const activeAppointmentCount = data.appointments.filter((item) => teacherIds.has(item.teacher_id)).length;
  if (activeAppointmentCount >= 10 || activeBindings.length < 2) return false;

  const now = new Date().toISOString();
  const today = localDate(0);
  const tomorrow = localDate(1);
  const yesterday = localDate(-1);
  const plans = [
    { date: yesterday, status: 'completed', starts: ['12:45', '15:00', '18:30'] },
    { date: today, status: 'booked', starts: ['12:00', '13:30', '15:45', '17:45', '18:30', '19:15'] },
    { date: tomorrow, status: 'booked', starts: ['12:45', '14:15', '16:30', '18:30'] }
  ];
  const byTeacher = [...teacherIds].map((teacherId) => activeBindings.filter((binding) => binding.teacher_id === teacherId));
  const endTime = (startTime) => {
    const [hour, minute] = startTime.split(':').map(Number);
    const date = new Date(2000, 0, 1, hour, minute + 45);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  let changed = false;
  for (const appointment of data.appointments) {
    if (teacherIds.has(appointment.teacher_id) && !appointment.lesson_note) {
      appointment.lesson_note = lessonNote(appointment.course);
      appointment.updated_at = now;
      changed = true;
    }
  }
  for (const [teacherIndex, bindings] of byTeacher.entries()) {
    for (const plan of plans) {
      const starts = plan.starts.slice(teacherIndex % 2, teacherIndex % 2 + 3);
      for (const [slotIndex, startTime] of starts.entries()) {
        const binding = bindings[(slotIndex + teacherIndex) % bindings.length];
        const contract = (data.contracts || []).find((item) => item.id === binding.contract_id) || {};
        const id = `seed-${plan.date}-${binding.teacher_id}-${startTime.replace(':', '')}`;
        if (data.appointments.some((item) => item.id === id || (item.teacher_id === binding.teacher_id && item.date === plan.date && item.start_time === startTime))) continue;
        const appointment = {
          id,
          student_id: binding.student_id,
          teacher_id: binding.teacher_id,
          campus_id: binding.campus_id,
          contract_id: binding.contract_id,
          course: binding.course || contract.course,
          date: plan.date,
          start_time: startTime,
          end_time: endTime(startTime),
          status: plan.status,
          lesson_note: lessonNote(binding.course || contract.course),
          created_at: now,
          updated_at: now,
          cancel_reason: ''
        };
        data.appointments.push(appointment);
        if (plan.status === 'completed') {
          data.lessonRecords.push({
            id: `record-${id}`,
            appointment_id: id,
            student_id: appointment.student_id,
            teacher_id: appointment.teacher_id,
            campus_id: appointment.campus_id,
            contract_id: appointment.contract_id,
            course: appointment.course,
            date: appointment.date,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            status: 'completed',
            billable: 1,
            difficulty: '适中',
            progress: lessonProgress(appointment.course),
            homework: lessonHomework(appointment.course),
            content: appointment.lesson_note,
            notes: '',
            created_at: now
          });
        }
        changed = true;
      }
    }
  }
  return changed;
}

function lessonNote(course) {
  if (course === '钢琴') return '识谱、手型与节奏稳定练习。';
  if (course === '电吉他') return '拨片控制、riff 节奏与音色练习。';
  return '和弦转换、分解节奏与歌曲段落练习。';
}

function lessonProgress(course) {
  if (course === '钢琴') return '基础手型与五指练习';
  if (course === '电吉他') return '拨片控制与基础 riff';
  return '开放和弦与节奏型';
}

function lessonHomework(course) {
  if (course === '钢琴') return '每天 10 分钟五指练习，保持节拍稳定。';
  if (course === '电吉他') return '慢速练习下拨上拨各 20 组。';
  return 'C/G/Am/F 慢速转换 20 组。';
}

export function resetStore() {
  const fresh = createInitialData();
  Object.keys(store).forEach((key) => delete store[key]);
  Object.assign(store, fresh);
  saveStore(store);
}

export function campusName(id) {
  return store.campuses.find((item) => item.id === id)?.name || '';
}

export function teacherName(id) {
  return store.teachers.find((item) => item.id === id)?.name || '';
}

export function studentName(id) {
  return store.students.find((item) => item.id === id)?.name || '';
}

export function contractById(id) {
  return store.contracts.find((item) => item.id === id);
}

export function availabilityForDate(teacherId, date) {
  return (store.teacherAvailability || []).find((item) => item.teacher_id === teacherId && item.date === date);
}

export function appointmentView(item) {
  const contract = contractById(item.contract_id) || {};
  return {
    ...item,
    student_name: studentName(item.student_id),
    teacher_name: teacherName(item.teacher_id),
    campus_name: campusName(item.campus_id),
    mode: contract.mode,
    total_lessons: contract.total_lessons,
    completed_lessons: contract.completed_lessons,
    book_level: contract.book_level,
    progress: contract.progress,
    lesson_note: item.lesson_note || ''
  };
}
