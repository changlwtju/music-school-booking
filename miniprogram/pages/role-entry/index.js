import { request } from '../../utils/request';

async function bindDemoProfile(role) {
  const app = getApp();
  const result = await request('/auth/demo-login', { method: 'POST', data: { role } });
  if (!result?.profile) return;
  if (role === 'teacher') {
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else {
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  }
}

async function bindAuthorizedProfile(role) {
  const app = getApp();
  const title = role === 'teacher' ? '老师端登录' : '学生端登录';
  const phone = await new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      placeholderText: '请输入后台授权手机号',
      confirmText: '登录',
      success: (res) => resolve(res.confirm ? (res.content || '').trim() : '')
    });
  });
  if (!phone) return false;
  const result = await request('/auth/role-login', { method: 'POST', data: { role, phone } });
  if (!result?.profile) return false;
  if (role === 'teacher') {
    app.globalData.teacherId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  } else {
    app.globalData.studentId = result.profile.id;
    app.globalData.campusId = result.profile.campus_id;
  }
  return true;
}

async function bindProfile(role) {
  const app = getApp();
  if (app.globalData.enableDemoLogin) {
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
  }
});
