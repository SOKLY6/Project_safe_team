import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Декодируем токен для проверки роли
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        const role = decoded.role;
        setIsAdmin(role === 'admin');
        setUser({ username: decoded.sub, role: role });
      } catch (e) {
        // Если не удалось декодировать, делаем запрос к API
        try {
          const response = await api.get('/auth/me');
          const role = response.data.role;
          setUser(response.data);
          setIsAdmin(role === 'admin');
        } catch (apiError) {
          console.error('Ошибка получения данных пользователя:', apiError);
          localStorage.removeItem('auth_token');
          setUser(null);
          setIsAdmin(false);
        }
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const token = response.data.access_token;
    localStorage.setItem('auth_token', token);
    await checkAuth();
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

