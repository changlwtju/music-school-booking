import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const defaultInputPath = path.resolve(backendRoot, '..', 'docs', 'data-templates', 'music-school-import', 'music-school-import-current-yidian.xlsx');
const defaultDatabasePath = process.env.DATABASE_PATH || path.resolve(backendRoot, 'data', 'spinach-music.json');

function parseArgs(argv) {
  const args = {
    input: defaultInputPath,
    database: defaultDatabasePath,
    dryRun: false,
    replace: true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') args.input = path.resolve(argv[++index]);
    else if (arg === '--database') args.database = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--merge') args.replace = false;
    else if (arg === '--replace') args.replace = true;
    else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: npm run import:music-school -- [--input path/to.xlsx] [--database path/to/spinach-music.json] [--dry-run] [--replace|--merge]',
        '',
        `Default input: ${defaultInputPath}`,
        `Default database: ${defaultDatabasePath}`
      ].join('\n'));
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function stableId(prefix, ...parts) {
  const hash = crypto.createHash('sha1')
    .update(parts.map((part) => String(part || '').trim()).join('|'))
    .digest('hex')
    .slice(0, 10);
  return `${prefix}-${hash}`;
}

function text(value) {
  return String(value ?? '').trim();
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitCourses(value, fallback) {
  const courses = text(value || fallback)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return courses.length ? [...new Set(courses)] : [];
}

function excelDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }
  }
  return text(value);
}

function normalizeStatus(value) {
  const status = text(value);
  if (['停用', '已停用', 'inactive'].includes(status)) return 'inactive';
  if (['已到期', '到期', 'expired'].includes(status)) return 'expired';
  if (['体验课', 'trial'].includes(status)) return 'trial';
  return 'active';
}

function normalizePaymentStatus(value) {
  const status = text(value);
  if (['分期', '分期会员', 'installment'].includes(status)) return 'installment';
  if (['体验课', 'trial'].includes(status)) return 'trial';
  if (['已付清', '已缴费', 'paid'].includes(status)) return 'paid';
  return status || 'pending';
}

function normalizeMode(value) {
  const mode = text(value);
  if (mode.includes('册')) return 'book';
  return 'fixed20';
}

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Excel 缺少工作表：${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

function upsertById(list, item) {
  const existing = list.find((entry) => entry.id === item.id);
  if (existing) Object.assign(existing, item);
  else list.push(item);
}

function buildImportData(workbook, existingStore) {
  const now = new Date().toISOString();
  const campuses = readSheet(workbook, '校区信息')
    .filter((row) => text(row['校区名称']) && text(row['校区简称']));
  const teachers = readSheet(workbook, '老师信息')
    .filter((row) => text(row['老师姓名']) && text(row['所属校区']));
  const studentRows = readSheet(workbook, '学生信息')
    .filter((row) => text(row['学生姓名']) && text(row['课程名称']) && text(row['授课老师']));

  const campusByShortName = new Map();
  const imported = {
    campuses: [],
    teachers: [],
    users: [],
    students: [],
    contracts: [],
    bindings: []
  };

  for (const row of campuses) {
    const shortName = text(row['校区简称']);
    const id = stableId('campus', shortName, row['校区名称']);
    campusByShortName.set(shortName, id);
    imported.campuses.push({
      id,
      name: text(row['校区名称']),
      short_name: shortName,
      address: text(row['校区地址']),
      phone: text(row['联系电话']) || '请联系校区老师',
      latitude: null,
      longitude: null,
      hours: text(row['营业时间']) || '周二至周日 12:00-20:00',
      image: '/assets/brand/brand-display.png',
      release_time: '20:00',
      desc: text(row['备注'])
    });
  }

  const teacherByCampusAndName = new Map();
  for (const row of teachers) {
    const campusShortName = text(row['所属校区']);
    const campusId = campusByShortName.get(campusShortName);
    if (!campusId) throw new Error(`老师 ${row['老师姓名']} 关联了不存在的校区：${campusShortName}`);
    const name = text(row['老师姓名']);
    const id = stableId('teacher', campusShortName, name);
    const userId = stableId('user-teacher', campusShortName, name);
    teacherByCampusAndName.set(`${campusShortName}|${name}`, id);
    imported.users.push({
      id: userId,
      openid: `import-${userId}`,
      name,
      phone: text(row['手机号']),
      role: 'teacher',
      status: normalizeStatus(row['在职状态'])
    });
    imported.teachers.push({
      id,
      user_id: userId,
      campus_id: campusId,
      name,
      phone: text(row['手机号']),
      avatar: '/assets/brand/avatar.png',
      primary_course: text(row['主授课程']),
      courses: splitCourses(row['可授课程'], row['主授课程']),
      status: normalizeStatus(row['在职状态'])
    });
  }

  const studentIdByKey = new Map();
  for (const row of studentRows) {
    const campusShortName = text(row['所属校区']);
    const campusId = campusByShortName.get(campusShortName);
    if (!campusId) throw new Error(`学生 ${row['学生姓名']} 关联了不存在的校区：${campusShortName}`);

    const studentName = text(row['学生姓名']);
    const phone = text(row['联系电话']);
    const studentKey = phone ? `${campusShortName}|${phone}` : `${campusShortName}|${studentName}`;
    const studentId = studentIdByKey.get(studentKey) || stableId('student', studentKey);
    studentIdByKey.set(studentKey, studentId);

    if (!imported.students.some((item) => item.id === studentId)) {
      const userId = stableId('user-student', studentKey);
      imported.users.push({
        id: userId,
        openid: `import-${userId}`,
        name: studentName,
        phone,
        role: 'student',
        status: normalizeStatus(row['在读状态'])
      });
      imported.students.push({
        id: studentId,
        user_id: userId,
        campus_id: campusId,
        name: studentName,
        phone,
        avatar: '/assets/brand/avatar.png',
        enrolled_at: excelDate(row['报名日期']),
        expires_at: excelDate(row['到期日期']),
        payment_status: normalizePaymentStatus(row['缴费状态']),
        status: normalizeStatus(row['在读状态']),
        notes: text(row['备注'])
      });
    }

    const teacherName = text(row['授课老师']);
    const teacherId = teacherByCampusAndName.get(`${campusShortName}|${teacherName}`);
    if (!teacherId) throw new Error(`学生 ${studentName} 关联了不存在的老师：${teacherName}`);

    const course = text(row['课程名称']);
    const contractId = stableId('contract', studentId, course, teacherId);
    const bindingId = stableId('binding', studentId, course, teacherId);
    const mode = normalizeMode(row['课程类型']);
    const totalLessons = mode === 'book' ? null : (numberOrNull(row['总课时']) ?? 20);
    const completedLessons = numberOrNull(row['已上课时']) ?? 0;
    const signedAt = excelDate(row['报名日期']);
    imported.contracts.push({
      id: contractId,
      contract_no: `IMP-${contractId.slice('contract-'.length).toUpperCase()}`,
      student_id: studentId,
      campus_id: campusId,
      course,
      mode,
      book_level: text(row['按册级别']),
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      valid_lessons: completedLessons,
      invalid_lessons: 0,
      progress: text(row['当前进度']),
      signed_at: signedAt,
      expires_at: excelDate(row['到期日期']),
      status: normalizeStatus(row['在读状态']),
      attachment_url: ''
    });
    imported.bindings.push({
      id: bindingId,
      student_id: studentId,
      teacher_id: teacherId,
      campus_id: campusId,
      contract_id: contractId,
      course,
      status: normalizeStatus(row['在读状态']),
      created_at: signedAt || now
    });
  }

  const nextStore = structuredClone(existingStore);
  return { imported, store: nextStore };
}

function applyImport(existingStore, imported, { replace }) {
  const nextStore = structuredClone(existingStore);
  if (replace) {
    const importedIds = {
      students: new Set(imported.students.map((item) => item.id)),
      teachers: new Set(imported.teachers.map((item) => item.id)),
      contracts: new Set(imported.contracts.map((item) => item.id)),
      bindings: new Set(imported.bindings.map((item) => item.id)),
      users: new Set(imported.users.map((item) => item.id)),
      campuses: new Set(imported.campuses.map((item) => item.id))
    };
    nextStore.appointments = (nextStore.appointments || []).filter((item) => importedIds.students.has(item.student_id) && importedIds.teachers.has(item.teacher_id));
    nextStore.lessonRecords = (nextStore.lessonRecords || []).filter((item) => importedIds.students.has(item.student_id) && importedIds.teachers.has(item.teacher_id));
    nextStore.teacherAvailability = (nextStore.teacherAvailability || []).filter((item) => importedIds.teachers.has(item.teacher_id));
    for (const key of ['campuses', 'users', 'teachers', 'students', 'contracts', 'bindings']) nextStore[key] = [];
  }
  for (const key of ['campuses', 'users', 'teachers', 'students', 'contracts', 'bindings']) {
    nextStore[key] ||= [];
    for (const item of imported[key]) upsertById(nextStore[key], item);
  }
  return { imported, store: nextStore };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.input)) throw new Error(`找不到 Excel 文件：${args.input}`);
  if (!fs.existsSync(args.database)) throw new Error(`找不到数据库文件：${args.database}`);

  const workbook = XLSX.readFile(args.input, { cellDates: true });
  const existingStore = JSON.parse(fs.readFileSync(args.database, 'utf8'));
  const { imported } = buildImportData(workbook, existingStore);
  const { store } = applyImport(existingStore, imported, { replace: args.replace });

  const studentsByTeacher = new Map();
  for (const binding of imported.bindings) {
    const set = studentsByTeacher.get(binding.teacher_id) || new Set();
    set.add(binding.student_id);
    studentsByTeacher.set(binding.teacher_id, set);
  }

  console.log(`Import source: ${args.input}`);
  console.log(`Database: ${args.database}`);
  console.log(`Campuses: ${imported.campuses.length}`);
  console.log(`Teachers: ${imported.teachers.length}`);
  console.log(`Students: ${imported.students.length}`);
  console.log(`Contracts: ${imported.contracts.length}`);
  console.log(`Bindings: ${imported.bindings.length}`);
  console.log(`Mode: ${args.replace ? 'replace imported master data' : 'merge imported master data'}`);
  for (const teacher of imported.teachers) {
    console.log(`Teacher ${teacher.name}: ${teacher.id}, students ${studentsByTeacher.get(teacher.id)?.size || 0}`);
  }

  if (args.dryRun) {
    console.log('Dry run only. No file was written.');
    return;
  }

  const backupPath = `${args.database}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(args.database, backupPath);
  fs.writeFileSync(args.database, `${JSON.stringify(store, null, 2)}\n`);
  console.log(`Backup written: ${backupPath}`);
  console.log('Import completed.');
}

main();
