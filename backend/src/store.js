import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'spinach-music.json');

export const courseCatalog = [
  { id: 'course-piano', name: '钢琴', icon: '🎹', iconClass: 'piano', desc: '启蒙、考级与作品练习' },
  { id: 'course-guitar', name: '吉他', icon: '🎸', iconClass: 'guitar', desc: '弹唱、和弦与节奏训练' },
  { id: 'course-electric-guitar', name: '电吉他', icon: '🎸', iconClass: 'guitar', desc: '音色、riff 与节奏训练' },
  { id: 'course-drum', name: '架子鼓', icon: '🥁', iconClass: 'drum', desc: '节拍、律动与乐队配合' }
];

export function createInitialData() {
  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
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
        image: '/assets/brand/brand-display.png',
        release_time: '20:00',
        desc: '原表校区名称：一店御翠园店；二店资料待补充',
        status: 'active',
        display_order: 1,
        contact_person: '',
        map_keyword: '长春市净月区御翠园小区别墅区'
      }
    ],
    users: [
      { id: 'user-teacher-695b7e061b', openid: 'demo-teacher-695b7e061b', name: '刘芗齐', phone: '', role: 'teacher', status: 'active' },
      { id: 'user-teacher-c823a14da0', openid: 'demo-teacher-c823a14da0', name: '闻俊浩', phone: '', role: 'teacher', status: 'active' },
      { id: 'user-student-a4e31feaf1', openid: 'demo-student-a4e31feaf1', name: '唐鹏', phone: '', role: 'student', status: 'active' },
      { id: 'user-student-19ae2b74d3', openid: 'demo-student-19ae2b74d3', name: '薛冬瑞', phone: '', role: 'student', status: 'active' }
    ],
    accessUsers: [
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
      { id: 'appt-today-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: today, start_time: '15:00', end_time: '15:45', status: 'booked', created_at: now, updated_at: now, cancel_reason: '' },
      { id: 'appt-today-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: today, start_time: '18:30', end_time: '19:15', status: 'booked', created_at: now, updated_at: now, cancel_reason: '' }
    ],
    teacherAvailability: [],
    lessonRecords: []
  };
}

export function loadStore() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const data = createInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return data;
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (pruneLegacyDemoData(data)) saveStore(data);
  return data;
}

export function saveStore(store) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

export const store = loadStore();

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
    book_level: contract.book_level
  };
}
