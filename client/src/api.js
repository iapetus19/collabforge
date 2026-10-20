export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const getAuthToken = () => sessionStorage.getItem('cf_token');

export const setAuthSession = (token, user) => {
  sessionStorage.setItem('cf_token', token);
  sessionStorage.setItem('cf_user', JSON.stringify(user));
};

export const clearAuthSession = () => {
  sessionStorage.removeItem('cf_token');
  sessionStorage.removeItem('cf_user');
};

export const getStoredUser = () => {
  const raw = sessionStorage.getItem('cf_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data.data;
};
