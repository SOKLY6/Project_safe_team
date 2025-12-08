import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.DEV
  ? `http://${window.location.hostname}:8000`
  : `${window.location.protocol}//${window.location.host}/api`;
const TOKEN_KEY = 'auth_token';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const validateUsername = () => {
    if (!username.trim()) {
      setUsernameError('Введите логин');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('Введите пароль');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const uOk = validateUsername();
    const pOk = validatePassword();
    if (!uOk || !pOk) {
      return;
    }

    setUsernameError('');
    setPasswordError('');
    setStatus('Выполняется вход...');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password 
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.access_token) {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          // Перезагружаем страницу, чтобы AuthContext обновился с правильной ролью
          window.location.href = '/dashboard';
          return;
        } else {
          setPasswordError('Ошибка: токен не получен');
          setStatus('');
          return;
        }
      }

      // Обрабатываем ошибки
      let errorData = {};
      try { 
        const text = await response.text();
        if (text) {
          errorData = JSON.parse(text);
        }
      } catch (e) {}

      if (response.status === 401) {
        const detail = errorData.detail || '';
        const message = detail.includes('Incorrect') ? 'Неверный логин или пароль' : (detail || 'Неверный логин или пароль');
        setPasswordError(message);
        setStatus('');
        return;
      }

      // Для других ошибок показываем сообщение
      const errorMessage = errorData.detail || `Ошибка сервера (${response.status}). Повторите позже`;
      setPasswordError(errorMessage);
      setStatus('');
      
    } catch (err) {
      setPasswordError('Ошибка сети. Проверьте подключение к серверу');
      setStatus('');
    }
  };

  return (
    <div className="auth-bg">
      <div className="container min-vh-100 d-flex flex-column justify-content-center py-5">
        <div className="text-center mb-5">
          <h1 className="h2 mb-3 fw-bold text-white login-title">Добро пожаловать</h1>
          <p className="text-white-50 mb-0" style={{ fontSize: '1.1rem' }}>Войдите в систему безопасности</p>
        </div>
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{
              background: '#ffffff'
            }}>
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ 
                    width: '80px', 
                    height: '80px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                  }}>
                    <i className="bi bi-shield-lock text-white" style={{ fontSize: '32px' }}></i>
                  </div>
                  <h2 className="h4 mb-2 fw-bold">Вход в систему</h2>
                  <p className="text-muted small">Введите ваши учетные данные</p>
                </div>
                
                <form onSubmit={handleSubmit} autoComplete="on" noValidate>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">Логин</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bi bi-person"></i></span>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        className={`form-control ${usernameError ? 'is-invalid' : ''}`}
                        required
                        maxLength={64}
                        autoComplete="username"
                        autoFocus
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (usernameError) validateUsername();
                        }}
                        onBlur={validateUsername}
                      />
                    </div>
                    {usernameError && (
                      <div className="invalid-feedback d-block" id="username-error" aria-live="polite">
                        {usernameError}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Пароль</label>
                    <div className="input-group password-wrapper">
                      <span className="input-group-text"><i className="bi bi-lock"></i></span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                        required
                        maxLength={128}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword();
                        }}
                        onBlur={validatePassword}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary toggle-password"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <svg
                          className="icon-eye"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          width="20"
                          height="20"
                          style={{ display: showPassword ? 'none' : 'block' }}
                        >
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <svg
                          className="icon-eye-off"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          width="20"
                          height="20"
                          style={{ display: showPassword ? 'block' : 'none' }}
                        >
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58a3 3 0 004.24 4.24" />
                          <path d="M9.88 5.09A10.94 10.94 0 0112 5c7 0 11 7 11 7a17.74 17.74 0 01-3.21 3.87" />
                          <path d="M6.61 6.61A17.73 17.73 0 001 12s4 7 11 7a10.66 10.66 0 005.39-1.61" />
                        </svg>
                        <span className="visually-hidden">Показать пароль</span>
                      </button>
                    </div>
                    {passwordError && (
                      <div className="invalid-feedback d-block" id="password-error" aria-live="polite">
                        {passwordError}
                      </div>
                    )}
                  </div>
                  <div className="d-grid gap-2 mt-4">
                    <button type="submit" className="btn btn-primary btn-lg rounded-3" style={{
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Войти
                    </button>
                  </div>
                  {status && (
                    <div className="form-status small text-primary mt-3" id="form-status" aria-live="polite">
                      {status}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
