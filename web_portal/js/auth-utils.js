(function() {
  'use strict';

  const TOKEN_KEY = 'auth_token';

  // Получить токен из localStorage
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Декодировать JWT токен (без проверки подписи, только для получения данных)
  function decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Получить роль текущего пользователя
  function getCurrentUserRole() {
    const token = getToken();
    if (!token) return null;
    
    const decoded = decodeToken(token);
    return decoded ? decoded.role : null;
  }

  // Получить username текущего пользователя
  function getCurrentUsername() {
    const token = getToken();
    if (!token) return null;
    
    const decoded = decodeToken(token);
    return decoded ? decoded.sub : null;
  }

  // Проверить, является ли пользователь администратором
  function isAdmin() {
    return getCurrentUserRole() === 'admin';
  }

  // Проверить, является ли пользователь охранником
  function isGuard() {
    return getCurrentUserRole() === 'guard';
  }

  // Получить заголовки для авторизованных запросов
  function getAuthHeaders() {
    const token = getToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Проверить, авторизован ли пользователь
  function isAuthenticated() {
    return getToken() !== null;
  }

  // Выйти (удалить токен)
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
  }

  // Экспорт функций в глобальную область видимости
  window.authUtils = {
    getToken,
    getCurrentUserRole,
    getCurrentUsername,
    isAdmin,
    isGuard,
    getAuthHeaders,
    isAuthenticated,
    logout,
    decodeToken
  };

})();

