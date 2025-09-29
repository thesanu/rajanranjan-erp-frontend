import api from './api';

// ✅ Login
export const login = async (credentials) => {
  const res = await api.post('/Auth/login', credentials);
  return res.data;
};

// ✅ Check Session
export const checkSession = async () => {
  const res = await api.get('/Auth/status');
  return res.data;
};

// ✅ Logout
export const logout = async () => {
  const res = await api.post('/Auth/logout');
  return res.data; // in case backend returns message/status
};
