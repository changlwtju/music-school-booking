import cors from 'cors';
import dayjs from 'dayjs';
import express from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { buildSlots, canSelfChange, DEFAULT_SLOTS, isMonday, isReleased, remainingLessons } from './schedule.js';
import { appointmentView, campusName, contractById, saveStore, store, teacherName } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

function ok(res, data) {
  res.json({ data });
}

function fail(res, status, message) {
  res.status(status).json({ error: { message } });
}

function enrichRecord(record) {
  return {
    ...record,
    teacher_name: teacherName(record.teacher_id),
    campus_name: campusName(record.campus_id)
  };
}

app.get('/health', (_req, res) => ok(res, { status: 'ok' }));

app.post('/auth/demo-login', (req, res) => {
  const role = req.body?.role === 'teacher' ? 'teacher' : 'student';
  const user = store.users.find((item) => item.role === role && item.status === 'active');
  if (!user) return fail(res, 404, '未找到可用账号');
  const profile = role === 'teacher'
    ? store.teachers.find((item) => item.user_id === user.id)
    : store.students.find((item) => item.user_id === user.id);
  ok(res, { user, profile });
});

app.get('/campuses', (_req, res) => ok(res, store.campuses));

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
  ok(res, {
    date,
    rules: {
      openHours: '授课时间 12:00-20:00',
      release: '次日课表前一天 20:00 后释放',
      selfChange: '距离开课不足 1.5 小时不可自助改课'
    },
    slots: buildSlots({ date, appointments, contract })
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
  if (contract.mode === 'fixed20' && remainingLessons(contract) <= 0) return fail(res, 409, '剩余课时不足');
  const occupied = store.appointments.some((item) => item.teacher_id === binding.teacher_id && item.date === date && item.start_time === startTime && item.status === 'booked');
  if (occupied) return fail(res, 409, '该时间已被预约');

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
  ok(res, appointment);
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
  const appointments = store.appointments
    .filter((item) => item.teacher_id === req.params.teacherId && item.date === date)
    .map(appointmentView)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  ok(res, {
    date,
    notice: '同店老师课表可查看但不可代约课；课后长按课程录入学习内容。',
    appointments
  });
});

app.get('/teachers/:teacherId/students', (req, res) => {
  const keyword = String(req.query.keyword || '').trim();
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
        book_level: contract.book_level,
        progress: contract.progress
      };
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
