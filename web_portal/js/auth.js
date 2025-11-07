(function() {

  const USE_MOCK_AUTH = true;
  const MOCK_LOGIN = 'test_login';
  const MOCK_PASSWORD = 'test_password';
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

    if (USE_MOCK_AUTH) {
      const uVal = username.value.trim();
      const pVal = password.value;
      if (uVal !== MOCK_LOGIN) {
        showError(username, usernameError, 'Неизвестный логин');
        return;
      }
      if (pVal !== MOCK_PASSWORD) {
        showError(password, passwordError, 'Неизвестный пароль');
        return;
      }
      window.location.href = 'dashboard.html';
      return;
    }

    try {
      const response = await fetch(form.getAttribute('action') || '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value.trim(), password: password.value })
      });

      if (response.ok) {
        window.location.href = 'dashboard.html';
        return;
      }

      if (response.status === 401) {
        let data = {};
        try { data = await response.json(); } catch (_) {}
        const code = (data && (data.code || data.error || data.detail)) || '';
        if (String(code).toUpperCase().includes('WRONG_PASSWORD')) {
          showError(password, passwordError, 'Неизвестный пароль');
          return;
        }
        if (String(code).toUpperCase().includes('INVALID_LOGIN')) {
          showError(username, usernameError, 'Неизвестный логин');
          return;
        }
      }

      showError(password, passwordError, 'Ошибка сервера. Повторите позже');
    } catch (err) {
      showError(password, passwordError, 'Ошибка сети. Проверьте подключение');
    }
  });
})();


