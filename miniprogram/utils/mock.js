const formatDate = (offset = 0) => {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

const parseQuery = (path) => {
  const [, query = ''] = path.split('?');
  return query.split('&').reduce((params, pair) => {
    if (!pair) return params;
    const [key, value = ''] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value);
    return params;
  }, {});
};

const addMinutes = (time, minutes) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hour, minute + minutes);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const isReleased = (date) => {
  const todayDate = formatDate(0);
  if (date <= todayDate) return true;
  if (date > formatDate(1)) return false;
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}` >= '20:00';
};

const courseCatalog = [
  { id: 'course-piano', name: '钢琴', desc: '启蒙、考级与作品练习' },
  { id: 'course-guitar', name: '吉他', desc: '弹唱、和弦与节奏训练' },
  { id: 'course-electric-guitar', name: '电吉他', desc: '音色、riff 与节奏训练' },
  { id: 'course-drum', name: '架子鼓', desc: '节拍、律动与乐队配合' }
];

const campuses = [
  {
    id: 'campus-2d2207a805',
    name: '菠菜现代音乐一店（净月御翠园）',
    short_name: '一店',
    address: '长春市净月区御翠园小区别墅区',
    phone: '请联系校区老师',
    hours: '周二至周日 12:00-20:00',
    latitude: null,
    longitude: null,
    status: 'active',
    display_order: 1,
    map_keyword: '长春市净月区御翠园小区别墅区',
    desc: '原表校区名称：一店御翠园店；二店资料待补充'
  }
];

const students = [
  {
    id: 'student-a4e31feaf1',
    name: '唐鹏',
    phone: '18004498449',
    campus_id: 'campus-2d2207a805',
    enrolled_at: '2026-03-22',
    expires_at: '2027-03-22',
    payment_status: 'pending',
    status: 'active',
    notes: '报名有效期一年；按册学习；完成课程记录后计入当节有效课时。'
  },
  {
    id: 'student-acd652d146',
    name: '刘相麟',
    phone: '13844981087',
    campus_id: 'campus-2d2207a805',
    enrolled_at: '2026-05-20',
    expires_at: '2027-05-20',
    payment_status: 'pending',
    status: 'active',
    notes: '同时绑定钢琴与吉他课程。'
  },
  {
    id: 'student-19ae2b74d3',
    name: '薛冬瑞',
    phone: '15844238171',
    campus_id: 'campus-2d2207a805',
    enrolled_at: '2026-05-29',
    expires_at: '2027-05-29',
    payment_status: 'pending',
    status: 'active',
    notes: '电吉他课程。'
  }
];

const teachers = [
  { id: 'teacher-695b7e061b', name: '刘芗齐', phone: '', campus_id: 'campus-2d2207a805', primary_course: '钢琴', courses: ['钢琴'], status: 'active' },
  { id: 'teacher-c823a14da0', name: '闻俊浩', phone: '', campus_id: 'campus-2d2207a805', primary_course: '吉他', courses: ['吉他', '电吉他'], status: 'active' }
];

const contracts = [
  {
    id: 'contract-80ea18d164',
    contract_no: 'IMP-80EA18D164',
    student_id: 'student-a4e31feaf1',
    campus_id: 'campus-2d2207a805',
    course: '钢琴',
    mode: 'book',
    book_level: '',
    total_lessons: null,
    completed_lessons: 0,
    valid_lessons: 0,
    invalid_lessons: 0,
    progress: '',
    signed_at: '2026-03-22',
    expires_at: '2027-03-22',
    status: 'active'
  },
  {
    id: 'contract-60a9c338f3',
    contract_no: 'IMP-60A9C338F3',
    student_id: 'student-acd652d146',
    campus_id: 'campus-2d2207a805',
    course: '钢琴',
    mode: 'book',
    book_level: '',
    total_lessons: null,
    completed_lessons: 0,
    valid_lessons: 0,
    invalid_lessons: 0,
    progress: '',
    signed_at: '2026-05-20',
    expires_at: '2027-05-20',
    status: 'active'
  },
  {
    id: 'contract-bfebc23769',
    contract_no: 'IMP-BFEBC23769',
    student_id: 'student-acd652d146',
    campus_id: 'campus-2d2207a805',
    course: '吉他',
    mode: 'book',
    book_level: '',
    total_lessons: null,
    completed_lessons: 0,
    valid_lessons: 0,
    invalid_lessons: 0,
    progress: '',
    signed_at: '2026-05-20',
    expires_at: '2027-05-20',
    status: 'active'
  },
  {
    id: 'contract-9dbc6ae688',
    contract_no: 'IMP-9DBC6AE688',
    student_id: 'student-19ae2b74d3',
    campus_id: 'campus-2d2207a805',
    course: '电吉他',
    mode: 'book',
    book_level: '',
    total_lessons: null,
    completed_lessons: 0,
    valid_lessons: 0,
    invalid_lessons: 0,
    progress: '',
    signed_at: '2026-05-29',
    expires_at: '2027-05-29',
    status: 'active'
  }
];

const bindings = [
  { id: 'binding-80ea18d164', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', status: 'active' },
  { id: 'binding-60a9c338f3', student_id: 'student-acd652d146', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-60a9c338f3', course: '钢琴', status: 'active' },
  { id: 'binding-bfebc23769', student_id: 'student-acd652d146', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-bfebc23769', course: '吉他', status: 'active' },
  { id: 'binding-9dbc6ae688', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', status: 'active' }
];

const appointments = [
  { id: 'appt-today-piano-tang', student_id: 'student-a4e31feaf1', teacher_id: 'teacher-695b7e061b', campus_id: 'campus-2d2207a805', contract_id: 'contract-80ea18d164', course: '钢琴', date: formatDate(0), start_time: '15:00', end_time: '15:45', status: 'booked' },
  { id: 'appt-today-guitar-xue', student_id: 'student-19ae2b74d3', teacher_id: 'teacher-c823a14da0', campus_id: 'campus-2d2207a805', contract_id: 'contract-9dbc6ae688', course: '电吉他', date: formatDate(0), start_time: '18:30', end_time: '19:15', status: 'booked' }
];

const syncEvents = [
  {
    id: 'sync-initial-1',
    type: 'appointment',
    title: '学生预约已同步',
    content: '唐鹏的钢琴课程已同步到刘芗齐课表',
    teacher_id: 'teacher-695b7e061b',
    student_id: 'student-a4e31feaf1',
    appointment_id: 'appt-today-piano-tang',
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString()
  },
  {
    id: 'sync-initial-2',
    type: 'record',
    title: '上课记录已同步',
    content: '刘芗齐录入的钢琴学习内容已同步到学生端',
    teacher_id: 'teacher-695b7e061b',
    student_id: 'student-a4e31feaf1',
    appointment_id: 'recorded-piano',
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString()
  }
];

const records = [
  {
    id: 'record-piano',
    appointment_id: 'recorded-piano',
    student_id: 'student-a4e31feaf1',
    teacher_id: 'teacher-695b7e061b',
    campus_id: 'campus-2d2207a805',
    contract_id: 'contract-80ea18d164',
    course: '钢琴',
    date: formatDate(-2),
    start_time: '15:00',
    end_time: '15:45',
    status: 'completed',
    billable: 1,
    difficulty: '适中',
    progress: '基础指法与识谱入门',
    homework: '每天 10 分钟右手触键练习',
    content: '复习坐姿、手型和基础节奏，加入简单识谱。',
    notes: ''
  }
];

const schedulePresets = {
  'teacher-695b7e061b': {},
  'teacher-c823a14da0': {}
};

const slotStarts = ['12:00', '12:45', '13:30', '14:15', '15:00', '15:45', '16:30', '17:45', '18:30', '19:15'];

const campusById = (id) => campuses.find((item) => item.id === id) || {};
const studentById = (id) => students.find((item) => item.id === id) || {};
const teacherById = (id) => teachers.find((item) => item.id === id) || {};
const contractById = (id) => contracts.find((item) => item.id === id) || {};
const bindingById = (id) => bindings.find((item) => item.id === id) || {};

const remainingLessons = (contract) => {
  if (contract.total_lessons === null || contract.total_lessons === undefined) return null;
  return Math.max(0, Number(contract.total_lessons || 0) - Number(contract.completed_lessons || 0));
};

const enrichAppointment = (appointment) => {
  const contract = contractById(appointment.contract_id);
  return {
    ...appointment,
    student_name: studentById(appointment.student_id).name,
    teacher_name: teacherById(appointment.teacher_id).name,
    campus_name: campusById(appointment.campus_id).name,
    mode: contract.mode,
    total_lessons: contract.total_lessons,
    completed_lessons: contract.completed_lessons,
    book_level: contract.book_level || ''
  };
};

const enrichRecord = (record) => ({
  ...record,
  student_name: studentById(record.student_id).name,
  teacher_name: teacherById(record.teacher_id).name,
  campus_name: campusById(record.campus_id).name
});

const buildSlots = ({ teacherId, date }) => {
  if (!isReleased(date)) {
    return slotStarts.map((startTime) => ({
      startTime,
      endTime: addMinutes(startTime, 45),
      status: 'unreleased',
      reason: '课表尚未释放'
    }));
  }

  const weekday = new Date(`${date}T12:00:00`).getDay();
  if (weekday === 1) {
    return slotStarts.map((startTime) => ({
      startTime,
      endTime: addMinutes(startTime, 45),
      status: 'closed',
      reason: '周一全店休息'
    }));
  }

  const preset = schedulePresets[teacherId]?.[date] || {};
  const booked = appointments
    .filter((item) => item.teacher_id === teacherId && item.date === date && item.status === 'booked')
    .map((item) => item.start_time);

  return slotStarts.map((startTime) => {
    let status = 'available';
    let reason = '';
    if ((preset.closed || []).includes(startTime)) {
      status = 'closed';
      reason = '老师休息';
    } else if ((preset.disabled || []).includes(startTime)) {
      status = 'disabled';
      reason = '不可预约';
    } else if ((preset.occupied || []).includes(startTime) || booked.includes(startTime)) {
      status = 'occupied';
      reason = '该时间已被预约';
    }
    return { startTime, endTime: addMinutes(startTime, 45), status, reason };
  });
};

const studentSummary = (studentId) => {
  const student = studentById(studentId);
  const studentContracts = contracts
    .filter((item) => item.student_id === studentId)
    .map((item) => ({ ...item, remaining_lessons: remainingLessons(item) }));

  return {
    student: {
      ...student,
      campus_name: campusById(student.campus_id).name,
      campus_address: campusById(student.campus_id).address
    },
    contracts: studentContracts,
    bindings: bindings
      .filter((item) => item.student_id === studentId)
      .map((item) => ({ ...item, teacher_name: teacherById(item.teacher_id).name, teacher_avatar: '/assets/brand/avatar.jpg' })),
    nextAppointments: appointments
      .filter((item) => item.student_id === studentId && item.status === 'booked')
      .map(enrichAppointment)
      .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)),
    records: records
      .filter((item) => item.student_id === studentId)
      .map(enrichRecord)
      .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`))
  };
};

const teacherStudents = ({ teacherId, keyword = '', filter = 'active' }) => {
  const normalized = keyword.trim();
  return bindings
    .filter((item) => item.teacher_id === teacherId)
    .map((binding) => {
      const student = studentById(binding.student_id);
      const contract = contractById(binding.contract_id);
      return {
        ...student,
        campus_name: campusById(student.campus_id).name,
        course: contract.course,
        mode: contract.mode,
        contract_status: contract.status,
        total_lessons: contract.total_lessons,
        completed_lessons: contract.completed_lessons,
        remaining_lessons: remainingLessons(contract),
        book_level: contract.book_level || '',
        progress: contract.progress
      };
    })
    .filter((item) => filter === 'all' || (filter === 'installment' ? item.payment_status === 'installment' : item.status === filter))
    .filter((item) => !normalized || [item.name, item.phone, item.course, item.campus_name].some((value) => String(value || '').includes(normalized)));
};

const recentSyncEvents = ({ teacherId, studentId, limit = 6 } = {}) => syncEvents
  .filter((item) => (!teacherId || item.teacher_id === teacherId) && (!studentId || item.student_id === studentId))
  .sort((a, b) => b.created_at.localeCompare(a.created_at))
  .slice(0, Number(limit || 6));

export function mockRequest(path, options = {}) {
  const [pathname] = path.split('?');
  const query = parseQuery(path);

  if (pathname === '/auth/demo-login' && options.method === 'POST') {
    const role = options.data?.role === 'teacher' ? 'teacher' : 'student';
    if (role === 'teacher') {
      return Promise.resolve({
        user: { id: 'user-teacher-695b7e061b', role: 'teacher', name: '刘芗齐', status: 'active' },
        profile: teachers[0]
      });
    }
    return Promise.resolve({
      user: { id: 'user-student-a4e31feaf1', role: 'student', name: '唐鹏', status: 'active' },
      profile: students[0]
    });
  }

  if (pathname === '/payment-code') {
    return Promise.resolve({
      title: '菠菜现代音乐',
      payee: '菠菜现代音乐',
      note: '请在正式后台配置微信/支付宝收款二维码；当前为演示占位。',
      image: '/assets/brand/avatar.jpg',
      enabled: false
    });
  }

  if (pathname === '/courses') {
    return Promise.resolve(courseCatalog);
  }

  if (pathname === '/sync-events') {
    return Promise.resolve(recentSyncEvents({
      teacherId: query.teacherId,
      studentId: query.studentId,
      limit: query.limit
    }));
  }

  if (pathname === '/campuses') {
    return Promise.resolve(campuses);
  }

  if (pathname.includes('/summary')) {
    const studentId = pathname.split('/')[2] || 'student-a4e31feaf1';
    return Promise.resolve(studentSummary(studentId));
  }

  if (pathname.includes('/bookable-courses')) {
    const studentId = pathname.split('/')[2] || 'student-a4e31feaf1';
    return Promise.resolve(
      bindings
        .filter((item) => item.student_id === studentId && item.status === 'active')
        .map((binding) => {
          const contract = contractById(binding.contract_id);
          const teacher = teacherById(binding.teacher_id);
          return {
            id: binding.id,
            course: contract.course,
            teacher_id: teacher.id,
            teacher_name: teacher.name,
            contract_id: contract.id,
            mode: contract.mode,
            total_lessons: contract.total_lessons,
            completed_lessons: contract.completed_lessons,
            book_level: contract.book_level || ''
          };
        })
    );
  }

  if (pathname.startsWith('/schedule/slots')) {
    const teacherId = query.teacherId || 'teacher-695b7e061b';
    const date = query.date || formatDate(1);
    return Promise.resolve({
      rules: {
        openHours: `${teacherById(teacherId).name || '老师'} ${date} 12:00-20:00`,
        release: '次日课表前一天 20:00 后释放',
        selfChange: '距离开课不足 1.5 小时不可自助改课',
        availability: '老师默认周二至周日 12:00-20:00 全时段可约，后台仅维护请假或不可约例外'
      },
      slots: buildSlots({ teacherId, date })
    });
  }

  if (pathname === '/appointments' && options.method === 'POST') {
    const binding = bindingById(options.data.bindingId);
    if (!isReleased(options.data.date)) return Promise.resolve(null);
    const bookableSlot = buildSlots({ teacherId: binding.teacher_id, date: options.data.date })
      .find((item) => item.startTime === options.data.startTime);
    if (!bookableSlot || bookableSlot.status !== 'available') return Promise.resolve(null);
    const contract = contractById(binding.contract_id);
    const appointment = {
      id: `local-${Date.now()}`,
      student_id: options.data.studentId,
      teacher_id: binding.teacher_id,
      campus_id: binding.campus_id,
      contract_id: binding.contract_id,
      course: contract.course,
      date: options.data.date,
      start_time: options.data.startTime,
      end_time: addMinutes(options.data.startTime, 45),
      status: 'booked'
    };
    appointments.push(appointment);
    const enriched = enrichAppointment(appointment);
    syncEvents.unshift({
      id: `sync-${appointment.id}`,
      type: 'appointment',
      title: '学生预约已同步',
      content: `${enriched.student_name}的${enriched.course}课程已同步到${enriched.teacher_name}课表`,
      teacher_id: appointment.teacher_id,
      student_id: appointment.student_id,
      appointment_id: appointment.id,
      created_at: new Date().toISOString()
    });
    return Promise.resolve(enriched);
  }

  if (pathname === '/teachers') {
    return Promise.resolve(teachers.filter((item) => !query.campusId || item.campus_id === query.campusId));
  }

  if (pathname.startsWith('/teachers') && pathname.endsWith('/schedule')) {
    const teacherId = pathname.split('/')[2] || 'teacher-695b7e061b';
    const date = query.date || formatDate(1);
    return Promise.resolve({
      date,
      notice: '老师默认周二至周日 12:00-20:00 全时段排课；请假或临时不可约由后台维护。学生端约课权限按前一天 20:00 释放。',
      appointments: appointments
        .filter((item) => item.teacher_id === teacherId && item.date === date)
        .map(enrichAppointment)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    });
  }

  if (pathname.startsWith('/teachers') && pathname.endsWith('/students')) {
    const teacherId = pathname.split('/')[2] || 'teacher-695b7e061b';
    return Promise.resolve(teacherStudents({ teacherId, keyword: query.keyword || '', filter: query.filter || 'active' }));
  }

  if (pathname === '/lesson-records' && options.method === 'POST') {
    const appointment = appointments.find((item) => item.id === options.data.appointmentId);
    if (!appointment) return Promise.resolve(null);
    const record = {
      id: `record-${Date.now()}`,
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
      billable: 1,
      difficulty: options.data.difficulty || '',
      progress: options.data.progress || '',
      homework: options.data.homework || '',
      content: options.data.content || '',
      notes: options.data.notes || ''
    };
    records.unshift(record);
    appointment.status = 'completed';
    const enriched = enrichRecord(record);
    syncEvents.unshift({
      id: `sync-${record.id}`,
      type: 'record',
      title: '上课记录已同步',
      content: `${enriched.teacher_name}录入的${enriched.course}学习内容已同步到学生端`,
      teacher_id: record.teacher_id,
      student_id: record.student_id,
      appointment_id: appointment.id,
      created_at: new Date().toISOString()
    });
    return Promise.resolve(enriched);
  }

  if (pathname === '/lesson-records') {
    let data = records;
    if (query.studentId) data = data.filter((item) => item.student_id === query.studentId);
    if (query.teacherId) data = data.filter((item) => item.teacher_id === query.teacherId);
    return Promise.resolve(data.map(enrichRecord));
  }

  return Promise.resolve({});
}
