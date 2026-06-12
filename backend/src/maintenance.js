import fs from 'node:fs';
import path from 'node:path';
import { dbPath } from './store.js';

const command = process.argv[2];
const argPath = process.argv[3];

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
}

function assertJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  for (const key of ['campuses', 'students', 'teachers', 'contracts', 'bindings', 'appointments', 'lessonRecords']) {
    if (!Array.isArray(data[key])) {
      throw new Error(`恢复文件缺少数组字段：${key}`);
    }
  }
  return content;
}

function backup(targetPath = dbPath) {
  if (!fs.existsSync(targetPath)) throw new Error(`数据库文件不存在：${targetPath}`);
  const backupDir = path.join(path.dirname(targetPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `spinach-music-${timestamp()}.json`);
  fs.copyFileSync(targetPath, backupPath);
  console.log(backupPath);
}

function exportData(outputPath) {
  if (!fs.existsSync(dbPath)) throw new Error(`数据库文件不存在：${dbPath}`);
  const content = fs.readFileSync(dbPath, 'utf8');
  if (!outputPath) {
    process.stdout.write(content);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(outputPath);
}

function restore(sourcePath) {
  if (!sourcePath) throw new Error('请提供要恢复的 JSON 文件路径');
  const resolvedSource = path.resolve(sourcePath);
  const content = assertJsonFile(resolvedSource);
  if (fs.existsSync(dbPath)) backup(dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, content);
  console.log(`restored: ${dbPath}`);
}

try {
  if (command === 'backup') backup();
  else if (command === 'export') exportData(argPath);
  else if (command === 'restore') restore(argPath);
  else {
    console.log('Usage:');
    console.log('  node src/maintenance.js backup');
    console.log('  node src/maintenance.js export [output.json]');
    console.log('  node src/maintenance.js restore <backup.json>');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
