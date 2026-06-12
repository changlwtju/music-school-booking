import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dayjs from 'dayjs';
import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { buildSlots, canSelfChange, DEFAULT_SLOTS, isMonday, isReleased, remainingLessons } from './schedule.js';
import { appointmentView, availabilityForDate, campusName, contractById, courseCatalog, saveStore, store, teacherName } from './store.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, '..', 'uploads');
const adminSessions = new Map();
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'spinach2026';
const adminSessionTtlMs = 12 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use('/admin', express.static('admin'));
app.use('/assets', express.static('../miniprogram/assets'));
app.use('/uploads', express.static(uploadRoot));

function ok(res, data) {
  res.json({ data });
}

function fail(res, status, message) {
  res.status(status).json({ error: { message } });
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) adminSessions.delete(token);
    return fail(res, 401, '请先登录后台');
  }
  session.expiresAt = Date.now() + adminSessionTtlMs;
  req.admin = session;
  next();
}

function contractRemainingLessons(contract) {
  if (contract.total_lessons === null || contract.total_lessons === undefined) return null;
  return Math.max(0, Number(contract.total_lessons || 0) - Number(contract.completed_lessons || 0));
}

function stableId(prefix, ...parts) {
  const hash = crypto.createHash('sha1')
    .update(parts.map((part) => String(part || '').trim()).join('|'))
    .digest('hex')
    .slice(0, 10);
  return `${prefix}-${hash}`;
}

function upsertById(list, item) {
  const existing = list.find((entry) => entry.id === item.id);
  if (existing) Object.assign(existing, item);
  else list.push(item);
}

function splitList(value) {
  return String(value || '')
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStudentStatus(value) {
  if (['expired', '已到期', '到期'].includes(value)) return 'expired';
  if (['inactive', '停用'].includes(value)) return 'inactive';
  if (['trial', '体验课'].includes(value)) return 'trial';
  return 'active';
}

function normalizePaymentStatus(value) {
  if (['paid', '已付清', '已缴费'].includes(value)) return 'paid';
  if (['installment', '分期'].includes(value)) return 'installment';
  if (['trial', '体验课'].includes(value)) return 'trial';
  if (['pending', '待确认', '待缴费'].includes(value)) return 'pending';
  return value || 'pending';
}

function saveBase64File({ folder, fileName, data }) {
  if (!data) return '';
  const match = String(data).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return '';
  const mime = match[1];
  const extByMime = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };
  const rawExt = path.extname(String(fileName || '')).toLowerCase();
  const ext = rawExt || extByMime[mime] || '.bin';
  const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const dir = path.join(uploadRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safeName), Buffer.from(match[2], 'base64'));
  return `/uploads/${folder}/${safeName}`;
}

function normalizeTeacherStatus(value) {
  if (['inactive', '停用', '离职'].includes(value)) return 'inactive';
  return 'active';
}

function ensureAccessUsers() {
  store.accessUsers ||= [];
  for (const teacher of store.teachers || []) {
    if (!store.accessUsers.some((item) => item.role === 'teacher' && item.profile_id === teacher.id)) {
      store.accessUsers.push({
        id: stableId('access-teacher', teacher.id),
        role: 'teacher',
        profile_id: teacher.id,
        name: teacher.name,
        phone: teacher.phone || '',
        status: teacher.status || 'active',
        notes: '由老师档案自动生成'
      });
    }
  }
  for (const student of store.students || []) {
    if (!store.accessUsers.some((item) => item.role === 'student' && item.profile_id === student.id)) {
      store.accessUsers.push({
        id: stableId('access-student', student.id),
        role: 'student',
        profile_id: student.id,
        name: student.name,
        phone: student.phone || '',
        status: student.status || 'active',
        notes: '由学员档案自动生成'
      });
    }
  }
}

function accessRows() {
  ensureAccessUsers();
  return (store.accessUsers || []).map((item) => {
    const profile = item.role === 'teacher'
      ? (store.teachers || []).find((teacher) => teacher.id === item.profile_id)
      : (store.students || []).find((student) => student.id === item.profile_id);
    return {
      ...item,
      profile_name: profile?.name || '',
      campus_name: campusName(profile?.campus_id),
      course: profile?.primary_course || ''
    };
  }).sort((a, b) => String(a.role).localeCompare(String(b.role)) || String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'));
}

function adminStudentRows({ keyword = '', teacherId = '', status = '' } = {}) {
  const normalized = String(keyword || '').trim();
  return (store.bindings || [])
    .filter((binding) => !teacherId || binding.teacher_id === teacherId)
    .map((binding) => {
      const student = store.students.find((item) => item.id === binding.student_id) || {};
      const teacher = store.teachers.find((item) => item.id === binding.teacher_id) || {};
      const contract = contractById(binding.contract_id) || {};
      return {
        binding_id: binding.id,
        student_id: student.id,
        name: student.name,
        phone: student.phone,
        status: student.status,
        payment_status: student.payment_status,
        campus_name: campusName(student.campus_id),
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        course: binding.course || contract.course,
        mode: contract.mode,
        book_level: contract.book_level,
        total_lessons: contract.total_lessons,
        completed_lessons: contract.completed_lessons,
        remaining_lessons: contractRemainingLessons(contract),
        enrolled_at: student.enrolled_at,
        expires_at: student.expires_at,
        progress: contract.progress,
        notes: student.notes
      };
    })
    .filter((item) => !status || item.status === status)
    .filter((item) => !normalized || [item.name, item.phone, item.course, item.teacher_name, item.campus_name].some((value) => String(value || '').includes(normalized)))
    .sort((a, b) => String(a.teacher_name).localeCompare(String(b.teacher_name), 'zh-Hans-CN') || String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'));
}

function normalizeAvailabilitySlots(slots) {
  return slots.map((item) => {
    const slot = DEFAULT_SLOTS.find(([start]) => start === item.startTime);
    if (!slot) return null;
    return {
      start_time: slot[0],
      end_time: slot[1],
      status: item.status,
      reason: item.reason || ''
    };
  }).filter(Boolean);
}

function buildFullDayClosedSlots(reason = '老师请假') {
  return DEFAULT_SLOTS.map(([startTime, endTime]) => ({
    start_time: startTime,
    end_time: endTime,
    status: 'closed',
    reason
  }));
}

function upsertTeacherAvailability({ teacherId, campusId, date, slots }) {
  const now = new Date().toISOString();
  store.teacherAvailability ||= [];
  const existing = availabilityForDate(teacherId, date);
  const availability = {
    id: existing?.id || `availability-${teacherId}-${date}`,
    teacher_id: teacherId,
    campus_id: campusId,
    date,
    slots,
    updated_at: now
  };
  if (existing) Object.assign(existing, availability);
  else store.teacherAvailability.push(availability);
  return availability;
}

function enrichRecord(record) {
  return {
    ...record,
    teacher_name: teacherName(record.teacher_id),
    campus_name: campusName(record.campus_id)
  };
}

function syncEvents({ teacherId, studentId, limit = 6 } = {}) {
  const appointmentEvents = (store.appointments || []).map((appointment) => {
    const view = appointmentView(appointment);
    return {
      id: `sync-${appointment.id}`,
      type: 'appointment',
      title: '学生预约已同步',
      content: `${view.student_name}的${view.course}课程已同步到${view.teacher_name}课表`,
      teacher_id: appointment.teacher_id,
      student_id: appointment.student_id,
      appointment_id: appointment.id,
      created_at: appointment.created_at || appointment.updated_at || ''
    };
  });

  const recordEvents = (store.lessonRecords || []).map((record) => {
    const view = enrichRecord(record);
    return {
      id: `sync-${record.id}`,
      type: 'record',
      title: '上课记录已同步',
      content: `${view.teacher_name}录入的${view.course}学习内容已同步到学生端`,
      teacher_id: record.teacher_id,
      student_id: record.student_id,
      appointment_id: record.appointment_id,
      created_at: record.created_at || ''
    };
  });

  return [...appointmentEvents, ...recordEvents]
    .filter((item) => (!teacherId || item.teacher_id === teacherId) && (!studentId || item.student_id === studentId))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, Number(limit || 6));
}

app.get('/health', (_req, res) => ok(res, { status: 'ok' }));

app.get('/admin', (_req, res) => {
  res.sendFile('index.html', { root: 'admin' });
});

app.post('/admin/api/login', (req, res) => {
  const parsed = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '请输入账号和密码');
  if (!safeEqual(parsed.data.username, adminUsername) || !safeEqual(parsed.data.password, adminPassword)) {
    return fail(res, 401, '账号或密码不正确');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  adminSessions.set(token, {
    username: adminUsername,
    createdAt: Date.now(),
    expiresAt: Date.now() + adminSessionTtlMs
  });
  ok(res, { token, username: adminUsername, expires_in: adminSessionTtlMs / 1000 });
});

app.get('/admin/api/me', requireAdmin, (req, res) => {
  ok(res, { username: req.admin.username });
});

app.post('/admin/api/logout', requireAdmin, (req, res) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  adminSessions.delete(token);
  ok(res, { ok: true });
});

app.get('/admin/api/dashboard', requireAdmin, (_req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const teacherStats = (store.teachers || []).map((teacher) => {
    const rows = adminStudentRows({ teacherId: teacher.id });
    const appointments = (store.appointments || []).filter((item) => item.teacher_id === teacher.id && item.status === 'booked');
    return {
      id: teacher.id,
      name: teacher.name,
      course: teacher.primary_course,
      status: teacher.status,
      student_count: new Set(rows.map((item) => item.student_id)).size,
      binding_count: rows.length,
      booked_count: appointments.length
    };
  });
  const courseStats = (store.bindings || []).reduce((acc, binding) => {
    const course = binding.course || contractById(binding.contract_id)?.course || '未填写';
    const item = acc.get(course) || { course, bindings: 0, students: new Set(), teachers: new Set() };
    item.bindings += 1;
    item.students.add(binding.student_id);
    item.teachers.add(binding.teacher_id);
    acc.set(course, item);
    return acc;
  }, new Map());
  const upcomingAppointments = (store.appointments || [])
    .filter((item) => item.status === 'booked')
    .map(appointmentView)
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))
    .slice(0, 8);
  const todayAppointments = (store.appointments || [])
    .filter((item) => item.date === today)
    .map(appointmentView)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const recentSync = syncEvents({ limit: 8 });
  const activeStudents = (store.students || []).filter((item) => item.status === 'active').length;
  const installmentStudents = (store.students || []).filter((item) => item.payment_status === 'installment').length;
  const expiringContracts = (store.contracts || []).filter((item) => item.expires_at && item.expires_at >= today && item.expires_at <= dayjs().add(30, 'day').format('YYYY-MM-DD')).length;
  ok(res, {
    counts: {
      campuses: (store.campuses || []).length,
      teachers: (store.teachers || []).length,
      students: (store.students || []).length,
      contracts: (store.contracts || []).length,
      bindings: (store.bindings || []).length,
      appointments: (store.appointments || []).length,
      lesson_records: (store.lessonRecords || []).length
    },
    studentStats: {
      active: activeStudents,
      installment: installmentStudents,
      expiring_contracts_30d: expiringContracts
    },
    release: {
      today,
      tomorrow,
      release_time: '20:00',
      tomorrow_released: isReleased(tomorrow),
      note: '学生端请求可约时段时实时判断：每天 20:00 自动开放次日课表，无需人工点击。'
    },
    teachers: teacherStats,
    courses: [...courseStats.values()].map((item) => ({
      course: item.course,
      binding_count: item.bindings,
      student_count: item.students.size,
      teacher_count: item.teachers.size
    })),
    campuses: store.campuses || [],
    todayAppointments,
    recentSync,
    upcomingAppointments
  });
});

app.get('/admin/api/students', requireAdmin, (req, res) => {
  ok(res, adminStudentRows({
    keyword: req.query.keyword,
    teacherId: req.query.teacherId,
    status: req.query.status
  }));
});

app.get('/admin/api/teachers', requireAdmin, (_req, res) => {
  ok(res, (store.teachers || []).map((teacher) => ({
    ...teacher,
    campus_name: campusName(teacher.campus_id),
    student_count: new Set(adminStudentRows({ teacherId: teacher.id }).map((item) => item.student_id)).size
  })));
});

app.post('/admin/api/teachers', requireAdmin, (req, res) => {
  const parsed = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    campusId: z.string().min(1),
    primaryCourse: z.string().min(1),
    courses: z.string().optional(),
    status: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '老师信息不完整');
  const campus = store.campuses.find((item) => item.id === parsed.data.campusId);
  if (!campus) return fail(res, 404, '校区不存在');
  const teacherId = stableId('teacher', campus.id, parsed.data.name);
  const userId = stableId('user-teacher', campus.id, parsed.data.name);
  const courses = splitList(parsed.data.courses || parsed.data.primaryCourse);
  const user = {
    id: userId,
    openid: `admin-${userId}`,
    name: parsed.data.name,
    phone: parsed.data.phone || '',
    role: 'teacher',
    status: normalizeTeacherStatus(parsed.data.status)
  };
  const teacher = {
    id: teacherId,
    user_id: userId,
    campus_id: campus.id,
    name: parsed.data.name,
    phone: parsed.data.phone || '',
    avatar: '/assets/brand/avatar.png',
    primary_course: parsed.data.primaryCourse,
    courses: courses.length ? courses : [parsed.data.primaryCourse],
    status: normalizeTeacherStatus(parsed.data.status)
  };
  upsertById(store.users, user);
  upsertById(store.teachers, teacher);
  saveStore(store);
  ok(res, teacher);
});

app.get('/admin/api/campuses', requireAdmin, (_req, res) => {
  ok(res, [...(store.campuses || [])].sort((a, b) => {
    const order = Number(a.display_order ?? 999) - Number(b.display_order ?? 999);
    return order || String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN');
  }));
});

app.post('/admin/api/campuses', requireAdmin, (req, res) => {
  const parsed = z.object({
    name: z.string().min(1),
    shortName: z.string().optional(),
    address: z.string().min(1),
    phone: z.string().optional(),
    hours: z.string().optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional(),
    desc: z.string().optional(),
    status: z.string().optional(),
    displayOrder: z.union([z.number(), z.string()]).optional(),
    contactPerson: z.string().optional(),
    mapKeyword: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '校区信息不完整');
  const shortName = parsed.data.shortName || parsed.data.name;
  const status = ['active', 'inactive', 'planned'].includes(parsed.data.status) ? parsed.data.status : 'active';
  const campus = {
    id: stableId('campus', shortName, parsed.data.name),
    name: parsed.data.name,
    short_name: shortName,
    address: parsed.data.address,
    phone: parsed.data.phone || '请联系校区老师',
    latitude: parsed.data.latitude === '' || parsed.data.latitude === undefined ? null : Number(parsed.data.latitude),
    longitude: parsed.data.longitude === '' || parsed.data.longitude === undefined ? null : Number(parsed.data.longitude),
    hours: parsed.data.hours || '周二至周日 12:00-20:00',
    image: '/assets/brand/brand-display.png',
    release_time: '20:00',
    desc: parsed.data.desc || '',
    status,
    display_order: parsed.data.displayOrder === '' || parsed.data.displayOrder === undefined ? (store.campuses || []).length + 1 : Number(parsed.data.displayOrder),
    contact_person: parsed.data.contactPerson || '',
    map_keyword: parsed.data.mapKeyword || parsed.data.address
  };
  upsertById(store.campuses, campus);
  saveStore(store);
  ok(res, campus);
});

app.post('/admin/api/students', requireAdmin, (req, res) => {
  const parsed = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    campusId: z.string().min(1),
    teacherId: z.string().min(1),
    course: z.string().min(1),
    mode: z.enum(['fixed20', 'book']).default('book'),
    bookLevel: z.string().optional(),
    totalLessons: z.union([z.number(), z.string()]).optional(),
    completedLessons: z.union([z.number(), z.string()]).optional(),
    enrolledAt: z.string().optional(),
    expiresAt: z.string().optional(),
    paymentStatus: z.string().optional(),
    status: z.string().optional(),
    progress: z.string().optional(),
    notes: z.string().optional(),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
    attachmentData: z.string().optional(),
    guardianName: z.string().optional(),
    birthday: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '学员信息不完整');
  const { name, phone = '', campusId, teacherId, course } = parsed.data;
  const campus = store.campuses.find((item) => item.id === campusId);
  if (!campus) return fail(res, 404, '校区不存在');
  const teacher = store.teachers.find((item) => item.id === teacherId && item.status === 'active');
  if (!teacher) return fail(res, 404, '老师不存在或已停用');

  const studentId = stableId('student', campusId, phone || name);
  const userId = stableId('user-student', campusId, phone || name);
  const contractId = stableId('contract', studentId, course, teacherId);
  const bindingId = stableId('binding', studentId, course, teacherId);
  const completedLessons = Number(parsed.data.completedLessons || 0);
  const totalLessons = parsed.data.mode === 'book' ? null : Number(parsed.data.totalLessons || 20);
  const studentStatus = normalizeStudentStatus(parsed.data.status);
  const nowDate = dayjs().format('YYYY-MM-DD');
  const uploadedAttachmentUrl = saveBase64File({
    folder: 'contracts',
    fileName: parsed.data.attachmentName,
    data: parsed.data.attachmentData
  });

  upsertById(store.users, {
    id: userId,
    openid: `admin-${userId}`,
    name,
    phone,
    role: 'student',
    status: studentStatus
  });
  upsertById(store.students, {
    id: studentId,
    user_id: userId,
    campus_id: campusId,
    name,
    phone,
    avatar: '/assets/brand/avatar.png',
    enrolled_at: parsed.data.enrolledAt || nowDate,
    expires_at: parsed.data.expiresAt || '',
    payment_status: normalizePaymentStatus(parsed.data.paymentStatus),
    status: studentStatus,
    guardian_name: parsed.data.guardianName || '',
    birthday: parsed.data.birthday || '',
    notes: parsed.data.notes || ''
  });
  upsertById(store.contracts, {
    id: contractId,
    contract_no: `ADM-${contractId.slice('contract-'.length).toUpperCase()}`,
    student_id: studentId,
    campus_id: campusId,
    course,
    mode: parsed.data.mode,
    book_level: parsed.data.bookLevel || '',
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    valid_lessons: completedLessons,
    invalid_lessons: 0,
    progress: parsed.data.progress || '',
    signed_at: parsed.data.enrolledAt || nowDate,
    expires_at: parsed.data.expiresAt || '',
    status: studentStatus,
    attachment_url: uploadedAttachmentUrl || parsed.data.attachmentUrl || ''
  });
  upsertById(store.bindings, {
    id: bindingId,
    student_id: studentId,
    teacher_id: teacherId,
    campus_id: campusId,
    contract_id: contractId,
    course,
    status: studentStatus,
    created_at: new Date().toISOString()
  });
  saveStore(store);
  ok(res, adminStudentRows({}).find((item) => item.binding_id === bindingId));
});

app.get('/admin/api/access-users', requireAdmin, (_req, res) => {
  ok(res, accessRows());
});

app.post('/admin/api/access-users', requireAdmin, (req, res) => {
  const parsed = z.object({
    role: z.enum(['student', 'teacher']),
    profileId: z.string().min(1),
    name: z.string().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '访问权限信息不完整');
  const profile = parsed.data.role === 'teacher'
    ? (store.teachers || []).find((item) => item.id === parsed.data.profileId)
    : (store.students || []).find((item) => item.id === parsed.data.profileId);
  if (!profile) return fail(res, 404, '关联档案不存在');
  const item = {
    id: stableId('access', parsed.data.role, parsed.data.profileId),
    role: parsed.data.role,
    profile_id: parsed.data.profileId,
    name: parsed.data.name || profile.name,
    phone: parsed.data.phone || profile.phone || '',
    status: parsed.data.status === 'inactive' ? 'inactive' : 'active',
    notes: parsed.data.notes || ''
  };
  store.accessUsers ||= [];
  upsertById(store.accessUsers, item);
  saveStore(store);
  ok(res, item);
});

app.get('/admin/api/appointments', requireAdmin, (req, res) => {
  const { date = '', teacherId = '', status = '' } = req.query;
  const data = (store.appointments || [])
    .filter((item) => !date || item.date === date)
    .filter((item) => !teacherId || item.teacher_id === teacherId)
    .filter((item) => !status || item.status === status)
    .map((item) => ({
      ...appointmentView(item),
      sync_source: item.created_by === 'admin' ? '后台创建' : '学生端预约',
      synced_to_teacher: Boolean(item.teacher_id)
    }))
    .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`));
  ok(res, data);
});

app.get('/admin/api/schedule-slots', requireAdmin, (_req, res) => {
  ok(res, DEFAULT_SLOTS.map(([startTime, endTime]) => ({ startTime, endTime })));
});

app.post('/admin/api/fixed-schedule-import', requireAdmin, (req, res) => {
  const parsed = z.object({
    teacherId: z.string().min(1),
    campusId: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekdays: z.array(z.union([z.number(), z.string()])).min(1),
    startTimes: z.array(z.string()).min(1),
    reason: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '固定课表导入信息不完整');
  const { teacherId, campusId, startDate, endDate, startTimes } = parsed.data;
  const teacher = store.teachers.find((item) => item.id === teacherId && item.status === 'active');
  if (!teacher) return fail(res, 404, '老师不存在或已停用');
  const campus = store.campuses.find((item) => item.id === campusId);
  if (!campus) return fail(res, 404, '校区不存在');
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return fail(res, 400, '日期范围无效');
  if (end.diff(start, 'day') > 180) return fail(res, 400, '单次最多导入 180 天固定课表');
  const weekdays = new Set(parsed.data.weekdays.map((item) => Number(item)));
  const selected = new Set(startTimes);
  const closedReason = parsed.data.reason || '非固定上课时间';
  const data = [];
  for (let cursor = start; !cursor.isAfter(end, 'day'); cursor = cursor.add(1, 'day')) {
    const date = cursor.format('YYYY-MM-DD');
    const weekday = cursor.day();
    const slots = DEFAULT_SLOTS.map(([startTime, endTime]) => {
      const shouldOpen = weekdays.has(weekday) && selected.has(startTime) && weekday !== 1;
      return {
        start_time: startTime,
        end_time: endTime,
        status: shouldOpen ? 'open' : 'closed',
        reason: shouldOpen ? '' : (weekday === 1 ? '周一全店休息' : closedReason)
      };
    });
    data.push(upsertTeacherAvailability({ teacherId, campusId, date, slots }));
  }
  saveStore(store);
  ok(res, { count: data.length, data });
});

app.post('/admin/api/lock-slots', requireAdmin, (req, res) => {
  const parsed = z.object({
    teacherId: z.string().min(1),
    campusId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().optional(),
    startTimes: z.array(z.string()).min(1)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '锁定时段信息不完整');
  const existing = availabilityForDate(parsed.data.teacherId, parsed.data.date);
  const existingByStart = new Map((existing?.slots || []).map((item) => [item.start_time, item]));
  const locked = new Set(parsed.data.startTimes);
  const slots = DEFAULT_SLOTS.map(([startTime, endTime]) => {
    const current = existingByStart.get(startTime);
    if (locked.has(startTime)) {
      return {
        start_time: startTime,
        end_time: endTime,
        status: 'closed',
        reason: parsed.data.reason || '临时不可约'
      };
    }
    return current || {
      start_time: startTime,
      end_time: endTime,
      status: 'open',
      reason: ''
    };
  });
  const availability = upsertTeacherAvailability({
    teacherId: parsed.data.teacherId,
    campusId: parsed.data.campusId,
    date: parsed.data.date,
    slots
  });
  saveStore(store);
  ok(res, availability);
});

app.get('/courses', (_req, res) => {
  const byName = new Map();
  for (const course of courseCatalog) byName.set(course.name, course);
  for (const course of store.courses || []) byName.set(course.name, { ...byName.get(course.name), ...course });
  ok(res, [...byName.values()]);
});

app.get('/payment-code', (_req, res) => {
  ok(res, {
    title: '菠菜现代音乐',
    payee: '菠菜现代音乐',
    note: '请在正式后台配置微信/支付宝收款二维码；当前为演示占位。',
    image: '/assets/brand/avatar.jpg',
    enabled: false
  });
});

app.get('/sync-events', (req, res) => {
  ok(res, syncEvents({
    teacherId: req.query.teacherId,
    studentId: req.query.studentId,
    limit: req.query.limit
  }));
});

app.post('/auth/demo-login', (req, res) => {
  const role = req.body?.role === 'teacher' ? 'teacher' : 'student';
  ensureAccessUsers();
  const inspectorAccess = (store.accessUsers || []).find((item) => (
    item.id === `access-inspector-${role}`
    && item.role === role
    && item.status === 'active'
  ));
  if (inspectorAccess) {
    const profile = role === 'teacher'
      ? store.teachers.find((item) => item.id === inspectorAccess.profile_id && item.status === 'active')
      : store.students.find((item) => item.id === inspectorAccess.profile_id && item.status === 'active');
    if (profile) {
      return ok(res, {
        user: {
          id: 'user-inspector',
          name: inspectorAccess.name,
          phone: inspectorAccess.phone,
          role,
          status: inspectorAccess.status
        },
        profile
      });
    }
  }
  const user = store.users.find((item) => item.role === role && item.status === 'active');
  if (!user) return fail(res, 404, '未找到可用账号');
  const profile = role === 'teacher'
    ? store.teachers.find((item) => item.user_id === user.id)
    : store.students.find((item) => item.user_id === user.id);
  ok(res, { user, profile });
});

app.post('/auth/role-login', (req, res) => {
  const parsed = z.object({
    role: z.enum(['student', 'teacher']),
    phone: z.string().min(1)
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '请输入手机号');
  ensureAccessUsers();
  const phone = parsed.data.phone.trim();
  const access = (store.accessUsers || []).find((item) => (
    item.role === parsed.data.role
    && item.status === 'active'
    && String(item.phone || '').trim() === phone
  ));
  if (!access) return fail(res, 403, '未开通该身份的小程序访问权限，请联系琴行后台添加');
  const profile = parsed.data.role === 'teacher'
    ? (store.teachers || []).find((item) => item.id === access.profile_id && item.status === 'active')
    : (store.students || []).find((item) => item.id === access.profile_id && item.status === 'active');
  if (!profile) return fail(res, 403, '关联档案已停用，请联系琴行');
  ok(res, {
    user: {
      id: access.id,
      name: access.name || profile.name,
      phone: access.phone,
      role: access.role,
      status: access.status
    },
    profile
  });
});

app.get('/campuses', (_req, res) => ok(res, (store.campuses || []).filter((item) => item.status !== 'inactive')));

app.get('/students/:studentId/summary', (req, res) => {
  const student = store.students.find((item) => item.id === req.params.studentId);
  if (!student) return fail(res, 404, '学生不存在');
  const campus = store.campuses.find((item) => item.id === student.campus_id) || {};
  const contracts = store.contracts
    .filter((item) => item.student_id === student.id)
    .map((item) => ({ ...item, remaining_lessons: remainingLessons(item) }));
  const bindings = store.bindings
    .filter((item) => item.student_id === student.id && item.status === 'active')
    .map((item) => ({ ...item, teacher_name: teacherName(item.teacher_id), teacher_avatar: store.teachers.find((teacher) => teacher.id === item.teacher_id)?.avatar || '' }));
  const nextAppointments = store.appointments
    .filter((item) => item.student_id === student.id && item.status === 'booked')
    .map(appointmentView)
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
  const records = store.lessonRecords
    .filter((item) => item.student_id === student.id)
    .map(enrichRecord)
    .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`));

  ok(res, {
    student: { ...student, campus_name: campus.name, campus_address: campus.address },
    contracts,
    bindings,
    nextAppointments,
    records
  });
});

app.get('/students/:studentId/bookable-courses', (req, res) => {
  const data = store.bindings
    .filter((item) => item.student_id === req.params.studentId && item.status === 'active')
    .map((binding) => {
      const teacher = store.teachers.find((item) => item.id === binding.teacher_id) || {};
      const contract = contractById(binding.contract_id) || {};
      return {
        ...binding,
        teacher_name: teacher.name,
        primary_course: teacher.primary_course,
        mode: contract.mode,
        total_lessons: contract.total_lessons,
        completed_lessons: contract.completed_lessons,
        book_level: contract.book_level,
        contract_status: contract.status
      };
    })
    .filter((item) => item.contract_status === 'active');
  ok(res, data);
});

app.get('/schedule/slots', (req, res) => {
  const parsed = z.object({
    teacherId: z.string(),
    contractId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).safeParse(req.query);
  if (!parsed.success) return fail(res, 400, '参数不完整');
  const { teacherId, contractId, date } = parsed.data;
  const contract = contractById(contractId);
  if (!contract) return fail(res, 404, '合同不存在');
  const appointments = store.appointments.filter((item) => item.teacher_id === teacherId && item.date === date);
  const availability = availabilityForDate(teacherId, date);
  ok(res, {
    date,
    availability_configured: Boolean(availability),
    rules: {
      openHours: '授课时间 12:00-20:00',
      release: '次日课表前一天 20:00 后释放',
      selfChange: '距离开课不足 1.5 小时不可自助改课',
      availability: '老师默认周二至周日 12:00-20:00 全时段可约，后台仅维护请假或不可约例外'
    },
    slots: buildSlots({ date, appointments, contract, availability })
  });
});

app.post('/appointments', (req, res) => {
  const parsed = z.object({
    studentId: z.string(),
    bindingId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '预约信息不完整');
  const { studentId, bindingId, date, startTime } = parsed.data;
  const slot = DEFAULT_SLOTS.find(([start]) => start === startTime);
  if (!slot) return fail(res, 400, '无效时间段');
  if (isMonday(date)) return fail(res, 409, '周一全店休息，不开放预约');
  if (!isReleased(date)) return fail(res, 409, '该日期课表尚未释放');
  const binding = store.bindings.find((item) => item.id === bindingId && item.student_id === studentId && item.status === 'active');
  if (!binding) return fail(res, 404, '未找到可预约课程');
  const contract = contractById(binding.contract_id);
  if (!contract || contract.status !== 'active') return fail(res, 409, '合同状态不可预约');
  const appointments = store.appointments.filter((item) => item.teacher_id === binding.teacher_id && item.date === date);
  const availability = availabilityForDate(binding.teacher_id, date);
  const bookableSlot = buildSlots({ date, appointments, contract, availability }).find((item) => item.startTime === startTime);
  if (!bookableSlot || bookableSlot.status !== 'available') return fail(res, 409, bookableSlot?.reason || '该时间不可预约');

  const now = new Date().toISOString();
  const appointment = {
    id: nanoid(),
    student_id: studentId,
    teacher_id: binding.teacher_id,
    campus_id: binding.campus_id,
    contract_id: binding.contract_id,
    course: binding.course,
    date,
    start_time: startTime,
    end_time: slot[1],
    status: 'booked',
    created_at: now,
    updated_at: now,
    cancel_reason: ''
  };
  store.appointments.push(appointment);
  saveStore(store);
  ok(res, appointmentView(appointment));
});

app.get('/admin/teacher-availability', (req, res) => {
  const parsed = z.object({
    teacherId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).safeParse(req.query);
  if (!parsed.success) return fail(res, 400, '参数不完整');
  const availability = availabilityForDate(parsed.data.teacherId, parsed.data.date);
  ok(res, availability || null);
});

app.put('/admin/teacher-availability', (req, res) => {
  const slotSchema = z.object({
    startTime: z.string(),
    status: z.enum(['open', 'closed']).default('open'),
    reason: z.string().optional()
  });
  const parsed = z.object({
    teacherId: z.string(),
    campusId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    leaveType: z.enum(['partial', 'full-day']).default('partial'),
    reason: z.string().optional(),
    slots: z.array(slotSchema).optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '可约时段信息不完整');
  const { teacherId, campusId, date, leaveType, reason = '老师请假', slots = [] } = parsed.data;
  const teacher = store.teachers.find((item) => item.id === teacherId && item.status === 'active');
  if (!teacher) return fail(res, 404, '老师不存在');
  const normalizedSlots = leaveType === 'full-day'
    ? buildFullDayClosedSlots(reason)
    : normalizeAvailabilitySlots(slots);
  if (!normalizedSlots.length) return fail(res, 400, '没有有效时段');

  const availability = upsertTeacherAvailability({ teacherId, campusId, date, slots: normalizedSlots });
  saveStore(store);
  ok(res, availability);
});

app.post('/admin/teacher-availability/bulk', (req, res) => {
  const slotSchema = z.object({
    startTime: z.string(),
    status: z.enum(['open', 'closed']).default('open'),
    reason: z.string().optional()
  });
  const parsed = z.object({
    teacherId: z.string(),
    campusId: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    leaveType: z.enum(['partial', 'full-day']).default('partial'),
    reason: z.string().optional(),
    slots: z.array(slotSchema).optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '批量排课信息不完整');
  const { teacherId, campusId, startDate, endDate, leaveType, reason = '老师请假', slots = [] } = parsed.data;
  const teacher = store.teachers.find((item) => item.id === teacherId && item.status === 'active');
  if (!teacher) return fail(res, 404, '老师不存在');
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return fail(res, 400, '日期范围无效');
  if (end.diff(start, 'day') > 730) return fail(res, 400, '单次最多批量生成 730 天排课');
  const normalizedSlots = leaveType === 'full-day'
    ? buildFullDayClosedSlots(reason)
    : normalizeAvailabilitySlots(slots);
  if (!normalizedSlots.length) return fail(res, 400, '没有有效时段');

  const data = [];
  for (let cursor = start; !cursor.isAfter(end, 'day'); cursor = cursor.add(1, 'day')) {
    const date = cursor.format('YYYY-MM-DD');
    const daySlots = isMonday(date)
      ? normalizedSlots.map((item) => ({ ...item, status: 'closed', reason: '周一全店休息' }))
      : normalizedSlots;
    data.push(upsertTeacherAvailability({ teacherId, campusId, date, slots: daySlots }));
  }
  saveStore(store);
  ok(res, { count: data.length, data });
});

app.post('/admin/trial-appointments', (req, res) => {
  const parsed = z.object({
    teacherId: z.string(),
    campusId: z.string(),
    studentName: z.string().min(1),
    studentPhone: z.string().optional(),
    course: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '体验课预约信息不完整');
  const { teacherId, campusId, studentName, studentPhone = '', course, date, startTime } = parsed.data;
  const slot = DEFAULT_SLOTS.find(([start]) => start === startTime);
  if (!slot) return fail(res, 400, '无效时间段');
  if (isMonday(date)) return fail(res, 409, '周一全店休息，不开放预约');
  const teacher = store.teachers.find((item) => item.id === teacherId && item.status === 'active');
  if (!teacher) return fail(res, 404, '老师不存在');
  const appointments = store.appointments.filter((item) => item.teacher_id === teacherId && item.date === date);
  const availability = availabilityForDate(teacherId, date);
  const bookableSlot = buildSlots({ date, appointments, availability, enforceRelease: false }).find((item) => item.startTime === startTime);
  if (!bookableSlot || bookableSlot.status !== 'available') return fail(res, 409, bookableSlot?.reason || '该时间不可预约');

  const now = new Date().toISOString();
  const student = {
    id: `trial-student-${nanoid()}`,
    user_id: '',
    campus_id: campusId,
    name: studentName,
    phone: studentPhone,
    avatar: '/assets/brand/avatar.png',
    enrolled_at: date,
    expires_at: date,
    payment_status: 'trial',
    status: 'trial',
    notes: '后台创建的体验课学员'
  };
  const appointment = {
    id: `trial-${nanoid()}`,
    student_id: student.id,
    teacher_id: teacherId,
    campus_id: campusId,
    contract_id: '',
    course,
    date,
    start_time: startTime,
    end_time: slot[1],
    status: 'booked',
    lesson_type: 'trial',
    created_by: 'admin',
    created_at: now,
    updated_at: now,
    cancel_reason: ''
  };
  store.students.push(student);
  store.appointments.push(appointment);
  saveStore(store);
  ok(res, appointmentView(appointment));
});

app.post('/appointments/:appointmentId/cancel', (req, res) => {
  const appointment = store.appointments.find((item) => item.id === req.params.appointmentId);
  if (!appointment) return fail(res, 404, '预约不存在');
  if (appointment.status !== 'booked') return fail(res, 409, '当前预约不可取消');
  if (!canSelfChange(appointment.date, appointment.start_time) && req.body?.actor !== 'admin') {
    return fail(res, 409, '距离开课不足 1.5 小时，请联系老师处理');
  }
  appointment.status = 'cancelled';
  appointment.cancel_reason = req.body?.reason || '学生自助取消';
  appointment.updated_at = new Date().toISOString();
  saveStore(store);
  ok(res, appointment);
});

app.get('/teachers', (req, res) => {
  const data = store.teachers.filter((item) => item.status === 'active' && (!req.query.campusId || item.campus_id === req.query.campusId));
  ok(res, data);
});

app.get('/teachers/:teacherId/schedule', (req, res) => {
  const date = req.query.date || dayjs().format('YYYY-MM-DD');
  const availability = availabilityForDate(req.params.teacherId, date);
  const appointments = store.appointments
    .filter((item) => item.teacher_id === req.params.teacherId && item.date === date)
    .map(appointmentView)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const availableSlotCount = buildSlots({
    date,
    appointments: store.appointments.filter((item) => item.teacher_id === req.params.teacherId && item.date === date),
    availability,
    enforceRelease: false
  }).filter((item) => item.status === 'available').length;
  ok(res, {
    date,
    availability_configured: Boolean(availability),
    available_slot_count: availableSlotCount,
    notice: '老师默认周二至周日 12:00-20:00 全时段排课；请假或临时不可约由后台维护。学生端约课权限按前一天 20:00 释放。',
    appointments
  });
});

app.get('/teachers/:teacherId/students', (req, res) => {
  const keyword = String(req.query.keyword || '').trim();
  const filter = String(req.query.filter || 'active');
  const data = store.bindings
    .filter((item) => item.teacher_id === req.params.teacherId)
    .map((binding) => {
      const student = store.students.find((item) => item.id === binding.student_id) || {};
      const contract = contractById(binding.contract_id) || {};
      return {
        ...student,
        campus_name: campusName(student.campus_id),
        course: contract.course,
        mode: contract.mode,
        contract_status: contract.status,
        total_lessons: contract.total_lessons,
        completed_lessons: contract.completed_lessons,
        remaining_lessons: contractRemainingLessons(contract),
        book_level: contract.book_level,
        progress: contract.progress
      };
    })
    .filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'installment') return item.payment_status === 'installment';
      return item.status === filter;
    })
    .filter((item) => !keyword || [item.name, item.phone, item.course].some((value) => String(value || '').includes(keyword)));
  ok(res, data);
});

app.post('/lesson-records', (req, res) => {
  const parsed = z.object({
    appointmentId: z.string(),
    content: z.string().min(1),
    difficulty: z.string().optional(),
    progress: z.string().optional(),
    homework: z.string().optional(),
    notes: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, '学习内容为必填项');
  const appointment = store.appointments.find((item) => item.id === parsed.data.appointmentId);
  if (!appointment) return fail(res, 404, '预约不存在');
  if (appointment.status !== 'booked') return fail(res, 409, '只有待上课预约可确认完成');
  const contract = contractById(appointment.contract_id);
  const nextCompleted = Number(contract.completed_lessons || 0) + 1;
  const billable = contract.mode === 'book' ? nextCompleted <= 12 : 1;
  const now = new Date().toISOString();
  const record = {
    id: nanoid(),
    appointment_id: appointment.id,
    student_id: appointment.student_id,
    teacher_id: appointment.teacher_id,
    campus_id: appointment.campus_id,
    contract_id: appointment.contract_id,
    course: appointment.course,
    date: appointment.date,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: 'completed',
    billable: billable ? 1 : 0,
    difficulty: parsed.data.difficulty || '',
    progress: parsed.data.progress || '',
    homework: parsed.data.homework || '',
    content: parsed.data.content,
    notes: parsed.data.notes || '',
    created_at: now
  };
  store.lessonRecords.push(record);
  appointment.status = 'completed';
  appointment.updated_at = now;
  contract.completed_lessons = Number(contract.completed_lessons || 0) + 1;
  contract.valid_lessons = Number(contract.valid_lessons || 0) + (billable ? 1 : 0);
  contract.invalid_lessons = Number(contract.invalid_lessons || 0) + (billable ? 0 : 1);
  contract.progress = parsed.data.progress || contract.progress;
  saveStore(store);
  ok(res, record);
});

app.get('/lesson-records', (req, res) => {
  let data = store.lessonRecords;
  if (req.query.studentId) data = data.filter((item) => item.student_id === req.query.studentId);
  if (req.query.teacherId) data = data.filter((item) => item.teacher_id === req.query.teacherId);
  ok(res, data.map(enrichRecord).sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`)));
});

app.get('/stats/teacher-monthly', (req, res) => {
  const month = req.query.month || dayjs().format('YYYY-MM');
  const data = store.teachers.map((teacher) => {
    const records = store.lessonRecords.filter((item) => item.teacher_id === teacher.id && item.date.startsWith(month));
    return {
      teacher_id: teacher.id,
      teacher_name: teacher.name,
      valid_lessons: records.filter((item) => item.billable).length,
      invalid_lessons: records.filter((item) => !item.billable).length,
      total_lessons: records.length
    };
  });
  ok(res, data);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  fail(res, 500, '服务器内部错误');
});

const port = Number(process.env.PORT || 3010);
app.listen(port, () => {
  console.log(`Spinach Music API listening on http://localhost:${port}`);
});
