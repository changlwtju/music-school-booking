import { request } from '../../utils/request';

function applyLoginResult(role, result) {
  const app = getApp();
  app.globalData.authToken = result.authToken || '';
  app.globalData.currentUser = result.user || null;
  wx.setStorageSync('roleAuthToken', app.globalData.authToken);
  wx.setStorageSync('roleUser', app.globalData.currentUser);
  wx.setStorageSync('roleProfile', result.profile);
  if (role === 'teacher') {
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else if (role === 'student') {
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  }
}

async function bindDemoProfile(role) {
  const result = await request('/auth/demo-login', { method: 'POST', data: { role } });
  if (!result?.profile) return;
  applyLoginResult(role, result);
}

async function bindAuthorizedProfile(role) {
  const app = getApp();
  const title = {
    teacher: '老师端登录',
    student: '学生端登录',
    manager: '管理者端登录'
  }[role];
  if (app.globalData.authToken && app.globalData.currentUser?.role === role) return true;
  const phone = await new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText: role === 'manager' ? '请输入管理者授权手机号' : '开发巡检可输入 13800000010',
      confirmText: '登录',
      success: (res) => resolve(res.confirm ? (res.content || '').trim() : '')
    });
  });
  if (!phone) return false;
  const result = await request('/auth/role-login', { method: 'POST', data: { role, phone } });
  if (!result?.profile) return false;
  if (role === 'manager') {
    app.globalData.authToken = result.authToken || '';
    app.globalData.currentUser = result.user || null;
    app.globalData.manager = result.user;
    wx.setStorageSync('roleAuthToken', app.globalData.authToken);
    wx.setStorageSync('roleUser', app.globalData.currentUser);
    wx.setStorageSync('managerProfile', result.user);
    return true;
  }
  applyLoginResult(role, result);
  return true;
}

async function bindProfile(role) {
  const app = getApp();
  if (app.globalData.enableDemoLogin && role !== 'manager') {
    await bindDemoProfile(role);
    return true;
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
