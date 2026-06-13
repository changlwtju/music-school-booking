import { mockRequest } from './mock';

const app = getApp();

function canUseMock(path) {
  return !path.startsWith('/auth/') && !path.startsWith('/manager/');
}

function networkErrorMessage(err) {
  const detail = String(err?.errMsg || '');
  const apiBase = String(app.globalData.apiBase || '');
  if (apiBase.startsWith('http://')) {
    return '真机无法访问 HTTP 接口，请配置 HTTPS 合法域名';
  }
  if (/domain|url not in domain list/i.test(detail)) {
    return '接口域名未加入微信小程序 request 合法域名';
  }
  return detail ? `网络请求失败：${detail}` : '网络请求失败，请检查接口域名';
}

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
      header: {
        ...(options.header || {}),
        ...(app.globalData.authToken ? { Authorization: `Bearer ${app.globalData.authToken}` } : {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data.data);
        } else if (res.statusCode === 404 && path.startsWith('/admin')) {
          mockRequest(path, options).then(resolve);
        } else {
          wx.showToast({ title: res.data?.error?.message || '请求失败', icon: 'none' });
          resolve(null);
        }
      },
      fail(err) {
        if (canUseMock(path)) {
          mockRequest(path, options).then(resolve);
          return;
        }
        wx.showModal({
          title: '无法连接服务器',
          content: networkErrorMessage(err),
          showCancel: false
        });
        resolve(null);
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
