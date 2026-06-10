import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'spinach-music.json');

export const courseCatalog = [
  { id: 'course-piano', name: '钢琴', icon: '🎹', iconClass: 'piano', desc: '启蒙、考级与作品练习' },
  { id: 'course-guitar', name: '吉他', icon: '🎸', iconClass: 'guitar', desc: '弹唱、和弦与节奏训练' },
  { id: 'course-drum', name: '架子鼓', icon: '🥁', iconClass: 'drum', desc: '节拍、律动与乐队配合' }
];

export function createInitialData() {
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    courses: courseCatalog,
    campuses: [
      { id: 'campus-main', name: '菠菜现代音乐一店（净月御翠园）', address: '长春市净月区御翠园小区别墅区', phone: '请联系校区老师', latitude: 43.7908, longitude: 125.4285, hours: '周二至周日 12:00-20:00', image: '/assets/brand/brand-display.png', release_time: '20:00', desc: '教学地点位于御翠园小区别墅区内，学习环境优越。' },
      { id: 'campus-east', name: '菠菜现代音乐二店（高新融创上城二期）', address: '长春市高新区融创上城二期小区别墅区', phone: '请联系校区老师', latitude: 43.8325, longitude: 125.2608, hours: '周二至周日 12:00-20:00', image: '/assets/brand/brand-display.png', release_time: '20:00', desc: '教学地点位于融创上城二期小区别墅区内，学习环境优越。' }
    ],
    users: [
      { id: 'user-student', openid: 'demo-student', name: '小菠菜', phone: '13800000001', role: 'student', status: 'active' },
      { id: 'user-teacher-lin', openid: 'demo-teacher', name: '林老师', phone: '13800000002', role: 'teacher', status: 'active' },
      { id: 'user-teacher-qiao', openid: 'demo-teacher-2', name: '乔老师', phone: '13800000003', role: 'teacher', status: 'active' }
    ],
    students: [
      { id: 'student-chen', user_id: 'user-student', campus_id: 'campus-main', name: '陈小雨', phone: '13800000001', avatar: '/assets/brand/avatar.png', enrolled_at: '2026-05-18', expires_at: '2027-05-18', payment_status: 'installment', status: 'active', notes: '节奏感很好，近期重点练习稳定拍。' }
    ],
    teachers: [
      { id: 'teacher-lin', user_id: 'user-teacher-lin', campus_id: 'campus-main', name: '林老师', phone: '13800000002', avatar: '/assets/brand/avatar.png', primary_course: '架子鼓', courses: ['架子鼓'], status: 'active' },
      { id: 'teacher-qiao', user_id: 'user-teacher-qiao', campus_id: 'campus-main', name: '乔老师', phone: '13800000003', avatar: '/assets/brand/avatar.png', primary_course: '吉他', courses: ['吉他'], status: 'active' }
    ],
    contracts: [
      { id: 'contract-drum', contract_no: 'SPM-20260518-001', student_id: 'student-chen', campus_id: 'campus-main', course: '架子鼓', mode: 'fixed20', book_level: '', total_lessons: 20, completed_lessons: 4, valid_lessons: 4, invalid_lessons: 0, progress: '四分音符与八分音符稳定练习', signed_at: '2026-05-18', expires_at: '2027-05-18', status: 'active', attachment_url: '' },
      { id: 'contract-guitar', contract_no: 'SPM-20260518-002', student_id: 'student-chen', campus_id: 'campus-main', course: '吉他', mode: 'book', book_level: '第一册', total_lessons: null, completed_lessons: 6, valid_lessons: 6, invalid_lessons: 0, progress: 'C/G/Am/F 和弦转换', signed_at: '2026-05-18', expires_at: '2027-05-18', status: 'active', attachment_url: '' }
    ],
    bindings: [
      { id: 'binding-drum', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', status: 'active', created_at: now },
      { id: 'binding-guitar', student_id: 'student-chen', teacher_id: 'teacher-qiao', campus_id: 'campus-main', contract_id: 'contract-guitar', course: '吉他', status: 'active', created_at: now }
    ],
    appointments: [
      { id: 'appt-demo', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', date: tomorrow, start_time: '15:00', end_time: '15:45', status: 'booked', created_at: now, updated_at: now, cancel_reason: '' }
    ],
    teacherAvailability: [],
    lessonRecords: [
      { id: 'record-demo', appointment_id: 'recorded-demo', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', date: '2026-06-07', start_time: '15:00', end_time: '15:45', status: 'completed', billable: 1, difficulty: '适中', progress: '八分音符稳定到 82 BPM', homework: '每天 10 分钟节拍器练习', content: '复习四分音符，加入八分音符与底鼓踩镲配合。', notes: '注意手腕放松。', created_at: now }
    ]
  };
}

export function loadStore() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    const data = createInitialData();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return data;
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

export function saveStore(store) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

export const store = loadStore();

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
