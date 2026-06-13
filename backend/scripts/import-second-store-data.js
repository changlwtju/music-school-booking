import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const defaultDatabasePath = process.env.DATABASE_PATH || path.join(backendRoot, 'data', 'spinach-music.json');

const staff = [
  { campus: '一店', name: '刘芗齐', phone: '15584430084', primaryCourse: '钢琴', courses: ['钢琴'], formerNames: ['刘梦齐'] },
  { campus: '一店', name: '闻俊浩', phone: '13894477985', primaryCourse: '吉他', courses: ['吉他', '电吉他'], formerNames: ['闫俊浩'] },
  { campus: '二店', name: '郝翰', phone: '18104028815', primaryCourse: '钢琴', courses: ['钢琴'], formerNames: ['郝瀚'] },
  { campus: '二店', name: '张日', phone: '15510986234', primaryCourse: '吉他', courses: ['吉他', '电吉他'] },
  { campus: '二店', name: '郁世辉', phone: '18643225081', primaryCourse: '架子鼓', courses: ['架子鼓'] }
];

function parseArgs(argv) {
  const args = { input: '', database: defaultDatabasePath, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') args.input = path.resolve(argv[++index]);
    else if (arg === '--database') args.database = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.input) throw new Error('请通过 --input 指定二店学员信息.xlsx');
  return args;
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

function dateFromMonthDay(value) {
  const raw = String(value || '').trim();
  const [monthText, dayText] = raw.split('.');
  const month = Number(monthText);
  const day = Number(dayText);
  if (!month || !day) return '';
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addOneYear(date) {
  if (!date) return '';
  return `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`;
}

function normalizeCourse(group, note) {
  if (String(note || '').includes('电吉他')) return '电吉他';
  if (String(group || '').includes('吉他')) return '吉他';
  if (String(group || '').includes('架子鼓')) return '架子鼓';
  return '钢琴';
}

function teacherNameFromGroup(group) {
  return String(group || '')
    .replace(/[（(]电[）)]/g, '')
    .replace(/^(钢琴|吉他|架子鼓)\s*/, '')
    .trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.input)) throw new Error(`找不到学生表：${args.input}`);
  if (!fs.existsSync(args.database)) throw new Error(`找不到数据库：${args.database}`);

  const database = JSON.parse(fs.readFileSync(args.database, 'utf8'));
  for (const key of ['campuses', 'users', 'teachers', 'students', 'contracts', 'bindings', 'accessUsers']) database[key] ||= [];

  const firstCampus = database.campuses.find((item) => item.short_name === '一店');
  if (!firstCampus) throw new Error('数据库中缺少一店校区，无法更新教职员');

  const secondCampus = {
    id: stableId('campus', '二店', '菠菜现代音乐二店（融创上城）'),
    name: '菠菜现代音乐二店（融创上城）',
    short_name: '二店',
    address: '长春市高新区融创上城二期别墅区',
    phone: '请联系校区老师',
    latitude: null,
    longitude: null,
    hours: '周二至周日 12:00-20:00',
    image: '/assets/brand/brand-display.jpg',
    release_time: '20:00',
    desc: '来源：二店学员信息.xlsx；位于融创上城二期别墅区',
    status: 'active',
    display_order: 2,
    contact_person: '',
    map_keyword: '长春市高新区融创上城二期别墅区'
  };
  upsertById(database.campuses, secondCampus);

  const campusByShortName = new Map([
    ['一店', firstCampus],
    ['二店', secondCampus]
  ]);
  const teacherByKey = new Map();

  for (const row of staff) {
    const campus = campusByShortName.get(row.campus);
    let teacher = database.teachers.find((item) => (
      item.campus_id === campus.id
      && [row.name, ...(row.formerNames || [])].includes(item.name)
    ));
    if (!teacher) {
      const id = stableId('teacher', row.campus, row.name);
      teacher = { id, user_id: stableId('user-teacher', row.campus, row.name) };
      database.teachers.push(teacher);
    }
    Object.assign(teacher, {
      campus_id: campus.id,
      name: row.name,
      phone: row.phone,
      avatar: teacher.avatar || '/assets/brand/avatar.png',
      primary_course: row.primaryCourse,
      courses: row.courses,
      status: 'active'
    });
    const user = {
      id: teacher.user_id,
      openid: database.users.find((item) => item.id === teacher.user_id)?.openid || `import-${teacher.user_id}`,
      name: row.name,
      phone: row.phone,
      role: 'teacher',
      status: 'active'
    };
    upsertById(database.users, user);
    for (const access of database.accessUsers.filter((item) => item.role === 'teacher' && item.profile_id === teacher.id)) {
      access.name = row.name;
      access.phone = row.phone;
    }
    for (const name of [row.name, ...(row.formerNames || [])]) {
      teacherByKey.set(`${row.campus}|${name}`, teacher);
    }
  }

  const workbook = XLSX.readFile(args.input, { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false }).slice(1);
  let currentGroup = '';
  let importedBindings = 0;
  const importedStudentIds = new Set();

  for (const row of rows) {
    if (row[1]) currentGroup = String(row[1]).trim();
    const studentName = String(row[2] || '').trim();
    const phone = String(row[3] || '').trim();
    if (!studentName || !currentGroup) continue;

    const teacherName = teacherNameFromGroup(currentGroup);
    const teacher = teacherByKey.get(`二店|${teacherName}`);
    if (!teacher) throw new Error(`未找到二店老师：${teacherName}`);
    const course = normalizeCourse(currentGroup, row[6]);
    const enrolledAt = dateFromMonthDay(row[4]);
    const studentKey = `二店|${phone || studentName}`;
    const studentId = stableId('student', studentKey);
    const userId = stableId('user-student', studentKey);
    const existingStudent = database.students.find((item) => item.id === studentId);
    const sourceNote = `来源：二店学员信息.xlsx；报名有效期一年${row[6] ? `；原表备注：${row[6]}` : ''}`;
    const notes = existingStudent?.notes?.includes(sourceNote)
      ? existingStudent.notes
      : [existingStudent?.notes, sourceNote].filter(Boolean).join('；');

    upsertById(database.users, {
      id: userId,
      openid: database.users.find((item) => item.id === userId)?.openid || `import-${userId}`,
      name: studentName,
      phone,
      role: 'student',
      status: 'active'
    });
    upsertById(database.students, {
      id: studentId,
      user_id: userId,
      campus_id: secondCampus.id,
      name: studentName,
      phone,
      avatar: existingStudent?.avatar || '/assets/brand/avatar.png',
      enrolled_at: existingStudent?.enrolled_at && existingStudent.enrolled_at < enrolledAt ? existingStudent.enrolled_at : enrolledAt,
      expires_at: addOneYear(enrolledAt),
      payment_status: existingStudent?.payment_status || 'pending',
      status: 'active',
      notes
    });
    importedStudentIds.add(studentId);

    const contractId = stableId('contract', studentId, course, teacher.id);
    const bindingId = stableId('binding', studentId, course, teacher.id);
    upsertById(database.contracts, {
      id: contractId,
      contract_no: `IMP-${contractId.slice('contract-'.length).toUpperCase()}`,
      student_id: studentId,
      campus_id: secondCampus.id,
      course,
      mode: 'book',
      book_level: '',
      total_lessons: null,
      completed_lessons: database.contracts.find((item) => item.id === contractId)?.completed_lessons || 0,
      valid_lessons: database.contracts.find((item) => item.id === contractId)?.valid_lessons || 0,
      invalid_lessons: database.contracts.find((item) => item.id === contractId)?.invalid_lessons || 0,
      progress: database.contracts.find((item) => item.id === contractId)?.progress || '',
      signed_at: enrolledAt,
      expires_at: addOneYear(enrolledAt),
      status: 'active',
      attachment_url: database.contracts.find((item) => item.id === contractId)?.attachment_url || ''
    });
    upsertById(database.bindings, {
      id: bindingId,
      student_id: studentId,
      teacher_id: teacher.id,
      campus_id: secondCampus.id,
      contract_id: contractId,
      course,
      status: 'active',
      created_at: enrolledAt
    });
    importedBindings += 1;
  }

  console.log(`二店学员：${importedStudentIds.size}`);
  console.log(`二店课程绑定：${importedBindings}`);
  console.log(`全部老师：${database.teachers.length}`);
  if (args.dryRun) {
    console.log('Dry run only. No file was written.');
    return;
  }

  const backupPath = `${args.database}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(args.database, backupPath);
  fs.writeFileSync(args.database, `${JSON.stringify(database, null, 2)}\n`);
  console.log(`备份：${backupPath}`);
  console.log('二店数据导入完成。');
}

main();
