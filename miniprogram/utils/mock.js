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

const courseCatalog = [
  { id: 'course-piano', name: '钢琴', icon: '♬', desc: '启蒙、考级与作品练习' },
  { id: 'course-guitar', name: '吉他', icon: '♩', desc: '弹唱、和弦与节奏训练' },
  { id: 'course-drum', name: '架子鼓', icon: '♪', desc: '节拍、律动与乐队配合' }
];

const campuses = [
  {
    id: 'campus-main',
    name: '菠菜现代音乐总店',
    address: '上海市浦东新区示例路 88 号 2F',
    phone: '021-12345678',
    hours: '周二至周日 12:00-20:00',
    latitude: 31.2304,
    longitude: 121.4737
  },
  {
    id: 'campus-east',
    name: '菠菜现代音乐东城店',
    address: '上海市浦东新区节拍路 66 号 3F',
    phone: '021-87654321',
    hours: '周二至周日 12:00-20:00',
    latitude: 31.2204,
    longitude: 121.4937
  }
];

const students = [
  {
    id: 'student-chen',
    name: '陈小雨',
    phone: '13800000001',
    campus_id: 'campus-main',
    enrolled_at: formatDate(-22),
    expires_at: formatDate(343),
    payment_status: 'installment',
    status: 'active',
    notes: '节奏感很好，近期重点练习稳定拍。'
  },
  {
    id: 'student-wang',
    name: '王一诺',
    phone: '13800000004',
    campus_id: 'campus-main',
    enrolled_at: formatDate(-68),
    expires_at: formatDate(297),
    payment_status: 'paid',
    status: 'active',
    notes: '和弦转换速度提升明显。'
  },
  {
    id: 'student-li',
    name: '李可',
    phone: '13800000005',
    campus_id: 'campus-main',
    enrolled_at: formatDate(-390),
    expires_at: formatDate(-18),
    payment_status: 'paid',
    status: 'expired',
    notes: '课程已到期，待续费。'
  }
];

const teachers = [
  { id: 'teacher-lin', name: '林老师', phone: '13800000002', campus_id: 'campus-main', primary_course: '架子鼓' },
  { id: 'teacher-qiao', name: '乔老师', phone: '13800000003', campus_id: 'campus-main', primary_course: '吉他' },
  { id: 'teacher-sun', name: '孙老师', phone: '13800000006', campus_id: 'campus-main', primary_course: '钢琴' }
];

const contracts = [
  {
    id: 'contract-drum',
    contract_no: `SPM-${formatDate(-22).replace(/-/g, '')}-001`,
    student_id: 'student-chen',
    campus_id: 'campus-main',
    course: '架子鼓',
    mode: 'fixed20',
    total_lessons: 20,
    completed_lessons: 4,
    valid_lessons: 4,
    invalid_lessons: 0,
    progress: '四分音符与八分音符稳定练习',
    signed_at: formatDate(-22),
    expires_at: formatDate(343),
    status: 'active'
  },
  {
    id: 'contract-guitar',
    contract_no: `SPM-${formatDate(-22).replace(/-/g, '')}-002`,
    student_id: 'student-chen',
    campus_id: 'campus-main',
    course: '吉他',
    mode: 'book',
    book_level: '第一册',
    total_lessons: null,
    completed_lessons: 6,
    valid_lessons: 6,
    invalid_lessons: 0,
    progress: 'C/G/Am/F 和弦转换',
    signed_at: formatDate(-22),
    expires_at: formatDate(343),
    status: 'active'
  },
  {
    id: 'contract-wang-guitar',
    contract_no: `SPM-${formatDate(-68).replace(/-/g, '')}-003`,
    student_id: 'student-wang',
    campus_id: 'campus-main',
    course: '吉他',
    mode: 'fixed20',
    total_lessons: 20,
    completed_lessons: 11,
    valid_lessons: 11,
    invalid_lessons: 0,
    progress: '扫弦节奏型与歌曲段落衔接',
    signed_at: formatDate(-68),
    expires_at: formatDate(297),
    status: 'active'
  },
  {
    id: 'contract-li-piano',
    contract_no: `SPM-${formatDate(-390).replace(/-/g, '')}-004`,
    student_id: 'student-li',
    campus_id: 'campus-main',
    course: '钢琴',
    mode: 'book',
    book_level: '第二册',
    total_lessons: null,
    completed_lessons: 12,
    valid_lessons: 11,
    invalid_lessons: 1,
    progress: '双手五指练习与基础识谱',
    signed_at: formatDate(-390),
    expires_at: formatDate(-18),
    status: 'expired'
  }
];

const bindings = [
  { id: 'binding-drum', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', status: 'active' },
  { id: 'binding-guitar', student_id: 'student-chen', teacher_id: 'teacher-qiao', campus_id: 'campus-main', contract_id: 'contract-guitar', course: '吉他', status: 'active' },
  { id: 'binding-wang-guitar', student_id: 'student-wang', teacher_id: 'teacher-qiao', campus_id: 'campus-main', contract_id: 'contract-wang-guitar', course: '吉他', status: 'active' },
  { id: 'binding-li-piano', student_id: 'student-li', teacher_id: 'teacher-sun', campus_id: 'campus-main', contract_id: 'contract-li-piano', course: '钢琴', status: 'expired' }
];

const appointments = [
  { id: 'appt-drum-1', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', date: formatDate(1), start_time: '15:00', end_time: '15:45', status: 'booked' },
  { id: 'appt-drum-2', student_id: 'student-chen', teacher_id: 'teacher-lin', campus_id: 'campus-main', contract_id: 'contract-drum', course: '架子鼓', date: formatDate(2), start_time: '16:30', end_time: '17:15', status: 'booked' },
  { id: 'appt-guitar-1', student_id: 'student-wang', teacher_id: 'teacher-qiao', campus_id: 'campus-main', contract_id: 'contract-wang-guitar', course: '吉他', date: formatDate(1), start_time: '18:30', end_time: '19:15', status: 'booked' },
  { id: 'appt-piano-1', student_id: 'student-li', teacher_id: 'teacher-sun', campus_id: 'campus-main', contract_id: 'contract-li-piano', course: '钢琴', date: formatDate(0), start_time: '17:45', end_time: '18:30', status: 'booked' }
];

const syncEvents = [
  {
    id: 'sync-initial-1',
    type: 'appointment',
    title: '学生预约已同步',
    content: '陈小雨的架子鼓课程已同步到林老师课表',
    teacher_id: 'teacher-lin',
    student_id: 'student-chen',
    appointment_id: 'appt-drum-1',
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString()
  },
  {
    id: 'sync-initial-2',
    type: 'record',
    title: '上课记录已同步',
    content: '林老师录入的架子鼓学习内容已同步到学生端',
    teacher_id: 'teacher-lin',
    student_id: 'student-chen',
    appointment_id: 'recorded-drum',
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString()
  }
];

const records = [
  {
    id: 'record-drum',
    appointment_id: 'recorded-drum',
    student_id: 'student-chen',
    teacher_id: 'teacher-lin',
    campus_id: 'campus-main',
    contract_id: 'contract-drum',
    course: '架子鼓',
    date: formatDate(-2),
    start_time: '15:00',
    end_time: '15:45',
    status: 'completed',
    billable: 1,
    difficulty: '适中',
    progress: '八分音符稳定到 82 BPM',
    homework: '每天 10 分钟节拍器练习',
    content: '复习四分音符，加入八分音符与底鼓踩镲配合。',
    notes: '注意手腕放松。'
  },
  {
    id: 'record-guitar',
    appointment_id: 'recorded-guitar',
    student_id: 'student-chen',
    teacher_id: 'teacher-qiao',
    campus_id: 'campus-main',
    contract_id: 'contract-guitar',
    course: '吉他',
    date: formatDate(-5),
    start_time: '18:30',
    end_time: '19:15',
    status: 'completed',
    billable: 1,
    difficulty: '偏难',
    progress: 'G 和弦到 Am 和弦转换',
    homework: '慢速循环 20 组和弦转换',
    content: '复习 C/G/Am/F，加入右手分解节奏。',
    notes: ''
  }
];

const schedulePresets = {
  'teacher-lin': {
    [formatDate(0)]: { closed: ['12:00', '12:45'], occupied: ['15:00', '18:30'] },
    [formatDate(1)]: { occupied: ['15:00'], disabled: ['19:15'] },
    [formatDate(2)]: { occupied: ['13:30', '16:30'] }
  },
  'teacher-qiao': {
    [formatDate(0)]: { closed: ['12:00'], occupied: ['14:15', '17:45'] },
    [formatDate(1)]: { occupied: ['12:45', '18:30'] },
    [formatDate(2)]: { occupied: ['15:45'], disabled: ['19:15'] }
  },
  'teacher-sun': {
    [formatDate(0)]: { occupied: ['17:45'] },
    [formatDate(1)]: { closed: ['12:00', '12:45', '13:30'] },
    [formatDate(2)]: { occupied: ['14:15', '18:30'] }
  }
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

  if (pathname === '/payment-code') {
    return Promise.resolve({
      title: '菠菜现代音乐',
      payee: '菠菜现代音乐总店',
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
    const studentId = pathname.split('/')[2] || 'student-chen';
    return Promise.resolve(studentSummary(studentId));
  }

  if (pathname.includes('/bookable-courses')) {
    const studentId = pathname.split('/')[2] || 'student-chen';
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
    const teacherId = query.teacherId || 'teacher-lin';
    const date = query.date || formatDate(1);
    return Promise.resolve({
      rules: {
        openHours: `${teacherById(teacherId).name || '老师'} ${date} 12:00-20:00`,
        release: '次日课表前一天 20:00 后释放',
        selfChange: '距离开课不足 1.5 小时不可自助改课'
      },
      slots: buildSlots({ teacherId, date })
    });
  }

  if (pathname === '/appointments' && options.method === 'POST') {
    const binding = bindingById(options.data.bindingId);
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
    const teacherId = pathname.split('/')[2] || 'teacher-lin';
    const date = query.date || formatDate(1);
    return Promise.resolve({
      date,
      notice: '同店老师课表可查看但不可代约课；请按时到店，课后长按课程录入学习内容。',
      appointments: appointments
        .filter((item) => item.teacher_id === teacherId && item.date === date)
        .map(enrichAppointment)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    });
  }

  if (pathname.startsWith('/teachers') && pathname.endsWith('/students')) {
    const teacherId = pathname.split('/')[2] || 'teacher-lin';
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
