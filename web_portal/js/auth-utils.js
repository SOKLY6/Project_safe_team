const TOKEN_KEY = 'auth_token';

const authUtils = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  },
  getCurrentUserRole() {
    const token = this.getToken();
    if (!token) return null;
    const decoded = this.decodeToken(token);
    return decoded?.role || null;
  },
  getCurrentUsername() {
    const token = this.getToken();
    if (!token) return null;
    const decoded = this.decodeToken(token);
    return decoded?.sub || null;
  },
  isAdmin() {
    return this.getCurrentUserRole() === 'admin';
  },
  isGuard() {
    return this.getCurrentUserRole() === 'guard';
  },
  getAuthHeaders() {
    const token = this.getToken();
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },
  isAuthenticated() {
    return this.getToken() !== null;
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
  }
};

window.authUtils = authUtils;
