import { mockRequest } from './mock';

const app = getApp();

export function request(path, options = {}) {
  const apiBase = app.globalData.apiBase;
  if (!apiBase) {
    return mockRequest(path, options);
  }
  return new Promise((resolve) => {
    wx.request({
      url: `${apiBase}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data.data);
        } else {
          wx.showToast({ title: res.data?.error?.message || '请求失败', icon: 'none' });
          resolve(null);
        }
      },
      fail() {
        mockRequest(path, options).then(resolve);
      }
    });
  });
}

export function today(offset = 0) {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
