(function() {
  'use strict';

  const API_BASE_URL = `http://${window.location.hostname}:8000`;
  const TOKEN_KEY = 'auth_token';

  const form = document.getElementById('login-form');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');
  const toggleBtn = document.querySelector('.toggle-password');
  const formStatus = document.getElementById('form-status');

  function showError(input, errorEl, message) {
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;
  }

  function clearError(input, errorEl) {
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    errorEl.textContent = '';
  }

  function validateUsername() {
    if (username.validity.valueMissing) {
      showError(username, usernameError, 'Введите логин');
      return false;
    }
    clearError(username, usernameError);
    return true;
  }

  function validatePassword() {
    if (password.validity.valueMissing) {
      showError(password, passwordError, 'Введите пароль');
      return false;
    }
    clearError(password, passwordError);
    return true;
  }

  username.addEventListener('input', validateUsername);
  password.addEventListener('input', validatePassword);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const isText = password.getAttribute('type') === 'text';
      password.setAttribute('type', isText ? 'password' : 'text');
      const pressed = !isText;
      toggleBtn.setAttribute('aria-pressed', String(pressed));
      toggleBtn.setAttribute('aria-label', pressed ? 'Скрыть пароль' : 'Показать пароль');
      const sr = toggleBtn.querySelector('.sr-only');
      if (sr) sr.textContent = pressed ? 'Скрыть пароль' : 'Показать пароль';
    });
  }

  form.addEventListener('submit', async function(e) {
    const uOk = validateUsername();
    const pOk = validatePassword();
    if (!uOk || !pOk) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    clearError(username, usernameError);
    clearError(password, passwordError);
    formStatus.textContent = 'Выполняется вход...';
    formStatus.className = 'form-status text-primary';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username.value.trim(), 
          password: password.value 
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.access_token) {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          
          window.location.href = 'dashboard.html';
          return;
        } else {
          showError(password, passwordError, 'Ошибка: токен не получен');
          formStatus.textContent = '';
          return;
        }
      }

      let errorData = {};
      try { 
        errorData = await response.json();
      } catch (e) {}

      if (response.status === 401) {
        const detail = errorData.detail || '';
        const message = detail.includes('Incorrect') ? 'Неверный логин или пароль' : (detail || 'Неверный логин или пароль');
        showError(password, passwordError, message);
        formStatus.textContent = '';
        return;
      }

      showError(password, passwordError, errorData.detail || 'Ошибка сервера. Повторите позже');
      formStatus.textContent = '';
      
    } catch (err) {
      showError(password, passwordError, 'Ошибка сети. Проверьте подключение к серверу');
      formStatus.textContent = '';
    }
  });
})();
