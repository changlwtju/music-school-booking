import { request } from '../../utils/request';

function storageKey(name, role) {
  return `role${name}:${role}`;
}

function restoreLoginResult(role) {
  const authToken = wx.getStorageSync(storageKey('AuthToken', role)) || '';
  const user = wx.getStorageSync(storageKey('User', role)) || null;
  const profile = wx.getStorageSync(storageKey('Profile', role)) || null;
  if (!authToken || user?.role !== role || !profile) return false;
  applyLoginResult(role, { authToken, user, profile });
  return true;
}

function applyLoginResult(role, result) {
  const app = getApp();
  app.globalData.authToken = result.authToken || '';
  app.globalData.currentUser = result.user || null;
  wx.setStorageSync(storageKey('AuthToken', role), app.globalData.authToken);
  wx.setStorageSync(storageKey('User', role), app.globalData.currentUser);
  wx.setStorageSync(storageKey('Profile', role), result.profile);
  if (role === 'teacher') {
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else if (role === 'student') {
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else if (role === 'manager') {
    app.globalData.manager = result.user;
  }
}

async function bindDemoProfile(role) {
  const result = await request('/auth/demo-login', { method: 'POST', data: { role } });
  if (!result?.profile) return false;
  applyLoginResult(role, result);
  return true;
}

async function bindAuthorizedProfile(role) {
  const app = getApp();
  const title = {
    teacher: '老师端登录',
    student: '学生端登录',
    manager: '管理员端登录'
  }[role];
  const phone = await new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText: role === 'manager' ? '请输入管理员授权手机号' : '请输入已授权手机号',
      confirmText: '登录',
      success: (res) => resolve(res.confirm ? (res.content || '').trim() : '')
    });
  });
  if (!phone) return false;
  const result = await request('/auth/role-login', { method: 'POST', data: { role, phone } });
  if (!result?.profile) return false;
  applyLoginResult(role, result);
  return true;
}

async function bindDevelopmentProfile(role) {
  const app = getApp();
  if (role !== 'manager') {
    return bindDemoProfile(role);
  }
  const result = await request('/auth/role-login', {
    method: 'POST',
    data: { role, phone: app.globalData.developmentInspectorPhone },
    silent: true
  });
  if (!result?.profile) return false;
  applyLoginResult(role, result);
  return true;
}

async function bindProfile(role) {
  const app = getApp();
  if (restoreLoginResult(role)) return true;
  if (app.globalData.developmentMode) {
    const ok = await bindDevelopmentProfile(role);
    if (ok) return true;
  }
  return bindAuthorizedProfile(role);
}

Page({
  async enterStudent() {
    const app = getApp();
    app.globalData.role = 'student';
    const ok = await bindProfile('student');
    if (!ok) return;
    wx.navigateTo({ url: '/pages/student-home/index' });
  },
  async enterTeacher() {
    const app = getApp();
    app.globalData.role = 'teacher';
    const ok = await bindProfile('teacher');
    if (!ok) return;
    wx.navigateTo({ url: '/pages/teacher-home/index' });
  },
  async enterManager() {
    const app = getApp();
    app.globalData.role = 'manager';
    const ok = await bindProfile('manager');
    if (!ok) return;
    wx.navigateTo({ url: '/pages/manager-booking/index' });
  }
});
