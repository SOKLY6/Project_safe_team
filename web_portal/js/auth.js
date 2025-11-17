(function() {
  'use strict';

  // API конфигурация
  const getApiBaseUrl = () => {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const port = window.location.port === '8001' ? '8000' : (window.location.port || '8000');
    const protocol = window.location.protocol;
    
    return `${protocol}//${hostname}:${port}`;
  };
  const API_BASE_URL = getApiBaseUrl();
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
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    // Показываем индикатор загрузки
    formStatus.textContent = 'Выполняется вход...';
    formStatus.className = 'form-status text-primary';

    const loginUrl = `${API_BASE_URL}/auth/login`;

    try {
      const response = await fetch(loginUrl, {
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
        
        // Сохраняем токен в localStorage
        if (data.access_token) {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          
          // Перенаправляем на главную страницу
          window.location.href = 'dashboard.html';
          return;
        } else {
          showError(password, passwordError, 'Ошибка: токен не получен');
          formStatus.textContent = '';
          return;
        }
      }

      // Обработка ошибок
      let errorData = {};
      try { 
        errorData = await response.json();
      } catch (e) {
        // Игнорируем ошибки парсинга
      }

      if (response.status === 401) {
        const detail = errorData.detail || '';
        if (detail.includes('Incorrect username or password') || detail.includes('Incorrect')) {
          showError(password, passwordError, 'Неверный логин или пароль');
          formStatus.textContent = '';
          return;
        }
        // Если другая 401 ошибка
        showError(password, passwordError, detail || 'Неверный логин или пароль');
        formStatus.textContent = '';
        return;
      }

      // Другие ошибки
      const errorMessage = errorData.detail || 'Ошибка сервера. Повторите позже';
      showError(password, passwordError, errorMessage);
      formStatus.textContent = '';
      
    } catch (err) {
      showError(password, passwordError, 'Ошибка сети. Проверьте подключение к серверу');
      formStatus.textContent = '';
    }
  });
})();


