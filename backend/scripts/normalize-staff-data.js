import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const defaultDatabasePath = process.env.DATABASE_PATH || path.join(backendRoot, 'data', 'spinach-music.json');

const corrections = [
  {
    role: 'manager',
    id: 'access-manager-zhu-yunsheng',
    legacyIds: ['access-manager-zhu-yuanxin'],
    fromNames: ['朱元鑫'],
    name: '朱云笙',
    phone: '16724456666',
    notes: '门店管理者；管理者端代约、取消及巡检账号'
  },
  {
    role: 'teacher',
    teacherId: 'teacher-695b7e061b',
    userId: 'user-teacher-695b7e061b',
    fromNames: ['刘梦齐'],
    name: '刘芗齐',
    phone: '15584430084',
    primaryCourse: '钢琴',
    courses: ['钢琴']
  },
  {
    role: 'teacher',
    teacherId: 'teacher-c823a14da0',
    userId: 'user-teacher-c823a14da0',
    fromNames: ['闫俊浩'],
    name: '闻俊浩',
    phone: '13894477985',
    primaryCourse: '吉他',
    courses: ['吉他', '电吉他']
  },
  {
    role: 'teacher',
    teacherId: 'teacher-3c5f1438ea',
    userId: 'user-teacher-3c5f1438ea',
    fromNames: ['郝瀚'],
    name: '郝翰',
    phone: '18104028815',
    primaryCourse: '钢琴',
    courses: ['钢琴']
  }
];

function parseArgs(argv) {
  const args = { database: defaultDatabasePath, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--database') args.database = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function renameEntityList(list, correction, matchProfileId = '') {
  let changed = 0;
  for (const item of list || []) {
    if (String(item.id || '').startsWith('access-inspector-')) continue;
    const isMatch = item.phone === correction.phone
      || item.id === correction.teacherId
      || item.id === correction.userId
      || correction.fromNames.includes(item.name)
      || (matchProfileId && item.profile_id === matchProfileId);
    if (!isMatch) continue;
    const before = JSON.stringify(item);
    item.name = correction.name;
    item.phone = correction.phone;
    if (correction.primaryCourse) item.primary_course = correction.primaryCourse;
    if (correction.courses) item.courses = correction.courses;
    if (before !== JSON.stringify(item)) changed += 1;
  }
  return changed;
}

function normalizeManagers(data, correction) {
  data.accessUsers ||= [];
  let changed = 0;
  let existing = data.accessUsers.find((item) => (
    item.id === correction.id
    || correction.legacyIds.includes(item.id)
    || (item.role === 'manager' && item.phone === correction.phone)
    || correction.fromNames.includes(item.name)
  ));
  if (!existing) {
    existing = {
      id: correction.id,
      role: 'manager',
      profile_id: '',
      wechat_openid: '',
      status: 'active'
    };
    data.accessUsers.push(existing);
    changed += 1;
  }
  const before = JSON.stringify(existing);
  existing.id = correction.id;
  existing.role = 'manager';
  existing.profile_id = '';
  existing.name = correction.name;
  existing.phone = correction.phone;
  existing.wechat_openid ||= '';
  existing.status ||= 'active';
  existing.notes = correction.notes;
  if (before !== JSON.stringify(existing)) changed += 1;
  return changed;
}

function normalizeTeachers(data, correction) {
  const teacher = (data.teachers || []).find((item) => (
    item.id === correction.teacherId
    || item.phone === correction.phone
    || correction.fromNames.includes(item.name)
  ));
  const profileId = teacher?.id || '';
  let changed = 0;
  changed += renameEntityList(data.teachers, correction);
  changed += renameEntityList(data.users, correction);
  changed += renameEntityList(data.accessUsers, correction, profileId);
  return changed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.database)) throw new Error(`找不到数据库：${args.database}`);
  const data = JSON.parse(fs.readFileSync(args.database, 'utf8'));
  let changed = 0;

  for (const correction of corrections) {
    changed += correction.role === 'manager'
      ? normalizeManagers(data, correction)
      : normalizeTeachers(data, correction);
  }

  console.log(`数据文件：${args.database}`);
  console.log(`修正项：${changed}`);
  if (args.dryRun) {
    console.log('Dry run only. No file was written.');
    return;
  }
  if (!changed) {
    console.log('没有发现需要修正的数据。');
    return;
  }

  const backupPath = `${args.database}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(args.database, backupPath);
  fs.writeFileSync(args.database, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`备份：${backupPath}`);
  console.log('姓名修正完成。');
}

main();
