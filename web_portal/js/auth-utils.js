(function() {
  'use strict';

  const TOKEN_KEY = 'auth_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

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

  function getCurrentUserRole() {
    const token = getToken();
    if (!token) return null;
    
    const decoded = decodeToken(token);
    return decoded ? decoded.role : null;
  }

  function getCurrentUsername() {
    const token = getToken();
    if (!token) return null;
    
    const decoded = decodeToken(token);
    return decoded ? decoded.sub : null;
  }

  function isAdmin() {
    return getCurrentUserRole() === 'admin';
  }

  function isGuard() {
    return getCurrentUserRole() === 'guard';
  }

  function getAuthHeaders() {
    const token = getToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  function isAuthenticated() {
    return getToken() !== null;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
  }

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
