import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token and active shopId header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeShop = localStorage.getItem('pos_active_shop');
  if (activeShop) {
    try {
      const parsed = JSON.parse(activeShop);
      if (parsed.shopId) {
        config.headers['x-shop-id'] = parsed.shopId;
      }
    } catch {}
  }

  const adminMode = localStorage.getItem('pos_admin_mode');
  if (adminMode === 'true') {
    config.headers['x-admin-mode'] = 'true';
  }

  return config;
});

// Response interceptor to handle unauthenticated 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (['SHOP_SUSPENDED', 'SHOP_INACTIVE'].includes(error.response?.data?.error?.code)) {
      window.dispatchEvent(new Event('pos:shop-status-changed'));
    }
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_active_shop');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
