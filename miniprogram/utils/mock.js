const tomorrow = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

const contracts = [
  {
    id: 'contract-drum',
    contract_no: 'SPM-20260518-001',
    course: '架子鼓',
    mode: 'fixed20',
    total_lessons: 20,
    completed_lessons: 4,
    remaining_lessons: 16,
    progress: '四分音符与八分音符稳定练习',
    status: 'active',
    signed_at: '2026-05-18',
    expires_at: '2027-05-18'
  },
  {
    id: 'contract-guitar',
    contract_no: 'SPM-20260518-002',
    course: '吉他',
    mode: 'book',
    book_level: '第一册',
    completed_lessons: 6,
    valid_lessons: 6,
    invalid_lessons: 0,
    progress: 'C/G/Am/F 和弦转换',
    status: 'active',
    signed_at: '2026-05-18',
    expires_at: '2027-05-18'
  }
];

const appointments = [
  {
    id: 'appt-demo',
    student_name: '陈小雨',
    teacher_name: '林老师',
    campus_name: '菠菜现代音乐总店',
    course: '架子鼓',
    date: tomorrow(),
    start_time: '15:00',
    end_time: '15:45',
    status: 'booked',
    mode: 'fixed20',
    total_lessons: 20,
    completed_lessons: 4
  }
];

const records = [
  {
    id: 'record-demo',
    course: '架子鼓',
    date: '2026-06-07',
    start_time: '15:00',
    end_time: '15:45',
    teacher_name: '林老师',
    campus_name: '菠菜现代音乐总店',
    status: 'completed',
    billable: 1,
    difficulty: '适中',
    progress: '八分音符稳定到 82 BPM',
    homework: '每天 10 分钟节拍器练习',
    content: '复习四分音符，加入八分音符与底鼓踩镲配合。',
    notes: '注意手腕放松。'
  }
];

export function mockRequest(path, options = {}) {
  if (path === '/campuses') {
    return Promise.resolve([
      { id: 'campus-main', name: '菠菜现代音乐总店', address: '上海市浦东新区示例路 88 号 2F', phone: '021-12345678', hours: '周二至周日 12:00-20:00', latitude: 31.2304, longitude: 121.4737 },
      { id: 'campus-east', name: '菠菜现代音乐东城店', address: '上海市浦东新区节拍路 66 号 3F', phone: '021-87654321', hours: '周二至周日 12:00-20:00', latitude: 31.2204, longitude: 121.4937 }
    ]);
  }
  if (path.includes('/summary')) {
    return Promise.resolve({
      student: { id: 'student-chen', name: '陈小雨', phone: '13800000001', campus_name: '菠菜现代音乐总店', enrolled_at: '2026-05-18', expires_at: '2027-05-18', payment_status: 'installment', notes: '节奏感很好，近期重点练习稳定拍。' },
      contracts,
      bindings: [
        { id: 'binding-drum', course: '架子鼓', teacher_id: 'teacher-lin', teacher_name: '林老师', contract_id: 'contract-drum' },
        { id: 'binding-guitar', course: '吉他', teacher_id: 'teacher-qiao', teacher_name: '乔老师', contract_id: 'contract-guitar' }
      ],
      nextAppointments: appointments,
      records
    });
  }
  if (path.includes('/bookable-courses')) {
    return Promise.resolve([
      { id: 'binding-drum', course: '架子鼓', teacher_id: 'teacher-lin', teacher_name: '林老师', contract_id: 'contract-drum', mode: 'fixed20', total_lessons: 20, completed_lessons: 4 },
      { id: 'binding-guitar', course: '吉他', teacher_id: 'teacher-qiao', teacher_name: '乔老师', contract_id: 'contract-guitar', mode: 'book', book_level: '第一册' }
    ]);
  }
  if (path.startsWith('/schedule/slots')) {
    return Promise.resolve({
      rules: { openHours: '12:00-20:00', release: '次日课表前一天 20:00 后释放', selfChange: '距离开课不足 1.5 小时不可自助改课' },
      slots: ['12:00', '12:45', '13:30', '14:15', '15:00', '15:45', '16:30', '17:45', '18:30', '19:15'].map((startTime) => ({
        startTime,
        endTime: startTime === '19:15' ? '20:00' : '',
        status: startTime === '15:00' ? 'occupied' : 'available',
        reason: startTime === '15:00' ? '该时间已被预约' : ''
      }))
    });
  }
  if (path === '/appointments' && options.method === 'POST') {
    return Promise.resolve({ id: `local-${Date.now()}`, ...options.data, status: 'booked' });
  }
  if (path.startsWith('/teachers') && path.endsWith('/schedule')) {
    return Promise.resolve({ date: tomorrow(), notice: '同店老师课表可查看但不可代约课；课后长按课程录入学习内容。', appointments });
  }
  if (path.startsWith('/teachers') && path.endsWith('/students')) {
    return Promise.resolve([
      { id: 'student-chen', name: '陈小雨', phone: '13800000001', campus_name: '菠菜现代音乐总店', course: '架子鼓', payment_status: 'installment', enrolled_at: '2026-05-18', progress: '八分音符稳定练习' }
    ]);
  }
  if (path === '/teachers') {
    return Promise.resolve([
      { id: 'teacher-lin', name: '林老师', primary_course: '架子鼓' },
      { id: 'teacher-qiao', name: '乔老师', primary_course: '吉他' }
    ]);
  }
  if (path === '/lesson-records') {
    return Promise.resolve(records);
  }
  return Promise.resolve({});
}
