export const adminFields = {
  contact: ['person', 'hotline', 'email', 'address', 'qr', 'ticker'],
  'service-image': ['image', 'alt'],
  video: ['discoverTitle', 'videoName', 'videoDescription', 'videoSource']
};

export const pageVisibilityDefaults = { posters: true, videos: true, faq: true };

export function serviceVideos(services) {
  return services.filter(item => item.youtube || item.videoUrl).map(item => ({
    id: item.id,
    enabled: item.enabled,
    service: item.id,
    discoverTitle: item.discoverTitle,
    videoName: item.videoName,
    videoDescription: item.videoDescription,
    youtube: item.youtube,
    videoUrl: item.videoUrl
  }));
}

export const planGroups = {
  tendoo: { packages: 'Gói Tendoo', devices: 'Danh sách thiết bị' },
  'viettel-ca': { new: 'Cấp mới', renew: 'Gia hạn' },
  vcontract: { paid: 'Gói hợp đồng kèm chứng thực', trial: 'Gói dùng thử' },
  sinvoice: { single: 'Đơn lẻ', new: 'Combo cấp mới CA và hóa đơn', renew: 'Combo gia hạn CA và hóa đơn' },
  vbhxh: { new: 'Cấp mới', renew: 'Gia hạn', trial: 'Dùng thử', combo: 'Combo CA và V-BHXH' },
  ftth: { static: 'IP tĩnh', dynamic: 'IP động' }
};

export const leadStatuses = { new: 'Mới', contacted: 'Đã liên hệ', closed: 'Đã xử lý' };
export const emailStatuses = { pending: 'Đang gửi', unconfigured: 'Chưa cấu hình email', failed: 'Gửi lỗi', sent: 'Đã gửi' };
export const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function phoneValid(value) {
  const digits = value.replace(/\D/g, '');
  return /^\+?[0-9 .()-]+$/.test(value) && digits.length >= 9 && digits.length <= 15 && value.length <= 30;
}
