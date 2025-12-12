import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.DEV
  ? `http://${window.location.hostname}:8000`
  : `${window.location.protocol}//${window.location.host}/api`;
const TOKEN_KEY = 'auth_token';

const endpoints = [
  {
    category: 'Пользователи',
    items: [
      {
        method: 'GET',
        path: '/users/',
        name: 'Получить список пользователей',
        queryParams: [
          { name: 'skip', type: 'number', required: false, label: 'Пропустить (опционально)', defaultValue: '0' },
          { name: 'limit', type: 'number', required: false, label: 'Лимит (опционально)', defaultValue: '100' }
        ]
      },
      {
        method: 'POST',
        path: '/users/login',
        name: 'Войти (пользователь)',
        fields: [
          { name: 'username', type: 'text', required: true, label: 'Логин' },
          { name: 'password', type: 'password', required: true, label: 'Пароль' }
        ]
      },
      {
        method: 'POST',
        path: '/users/register',
        name: 'Создать пользователя',
        fields: [
          { name: 'username', type: 'text', required: true, label: 'Логин' },
          { name: 'password', type: 'password', required: true, label: 'Пароль' },
          { name: 'name', type: 'text', required: true, label: 'Имя' },
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'GET',
        path: '/users/by-id/{user_id}',
        name: 'Получить пользователя по ID',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ]
      },
      {
        method: 'GET',
        path: '/users/by-telegram/{telegram_id}',
        name: 'Получить пользователя по Telegram ID',
        pathParams: [
          { name: 'telegram_id', type: 'number', required: true, label: 'Telegram ID' }
        ]
      },
      {
        method: 'PUT',
        path: '/users/{user_id}',
        name: 'Обновить пользователя по ID',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ],
        fields: [
          { name: 'name', type: 'text', required: true, label: 'Имя' },
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' },
          { name: 'telegram_id', type: 'number', required: false, label: 'Telegram ID (опционально)' }
        ]
      },
      {
        method: 'PUT',
        path: '/users/by-telegram/{telegram_id}',
        name: 'Обновить пользователя по Telegram ID',
        pathParams: [
          { name: 'telegram_id', type: 'number', required: true, label: 'Telegram ID' }
        ],
        fields: [
          { name: 'name', type: 'text', required: true, label: 'Имя' },
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'PUT',
        path: '/users/{user_id}/bind-telegram',
        name: 'Привязать Telegram к пользователю',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ],
        fields: [
          { name: 'telegram_id', type: 'number', required: true, label: 'Telegram ID' }
        ]
      },
      {
        method: 'DELETE',
        path: '/users/{user_id}',
        name: 'Удалить пользователя по ID',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ]
      },
      {
        method: 'DELETE',
        path: '/users/by-telegram/{telegram_id}',
        name: 'Удалить пользователя по Telegram ID',
        pathParams: [
          { name: 'telegram_id', type: 'number', required: true, label: 'Telegram ID' }
        ]
      }
    ]
  },
  {
    category: 'Организации',
    items: [
      {
        method: 'GET',
        path: '/organizations/',
        name: 'Получить список организаций'
      },
      {
        method: 'POST',
        path: '/organizations/',
        name: 'Создать организацию',
        fields: [
          { name: 'name', type: 'text', required: true, label: 'Название' }
        ]
      },
      {
        method: 'GET',
        path: '/organizations/{organization_id}',
        name: 'Получить организацию по ID',
        pathParams: [
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'PUT',
        path: '/organizations/{organization_id}',
        name: 'Обновить организацию',
        pathParams: [
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ],
        fields: [
          { name: 'name', type: 'text', required: true, label: 'Название' }
        ]
      },
      {
        method: 'DELETE',
        path: '/organizations/{organization_id}',
        name: 'Удалить организацию',
        pathParams: [
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      }
    ]
  },
  {
    category: 'QR Коды',
    items: [
      {
        method: 'POST',
        path: '/qr/generate',
        name: 'Сгенерировать QR код',
        fields: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' },
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'GET',
        path: '/qr/user/{user_id}',
        name: 'Получить QR коды пользователя',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ]
      },
      {
        method: 'GET',
        path: '/qr/active/{user_id}',
        name: 'Получить активный QR код пользователя',
        pathParams: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' }
        ]
      },
      {
        method: 'PUT',
        path: '/qr/update/{qr_id}',
        name: 'Обновить QR код',
        pathParams: [
          { name: 'qr_id', type: 'number', required: true, label: 'ID QR кода' }
        ],
        fields: [
          { name: 'user_id', type: 'number', required: true, label: 'ID пользователя' },
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'POST',
        path: '/qr/verify',
        name: 'Проверить QR код',
        fields: [
          { name: 'qr_data', type: 'text', required: true, label: 'QR данные' },
          { name: 'scanner_id', type: 'text', required: true, label: 'ID сканера' }
        ]
      },
      {
        method: 'POST',
        path: '/qr/scanner/verify',
        name: 'Проверить QR код (быстрая проверка)',
        fields: [
          { name: 'qr_data', type: 'text', required: true, label: 'QR данные' },
          { name: 'scanner_id', type: 'text', required: true, label: 'ID сканера' }
        ]
      },
      {
        method: 'GET',
        path: '/qr/active',
        name: 'Получить активные QR коды',
        queryParams: [
          { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
        ]
      },
      {
        method: 'DELETE',
        path: '/qr/delete/{qr_id}',
        name: 'Удалить QR код',
        pathParams: [
          { name: 'qr_id', type: 'number', required: true, label: 'ID QR кода' }
        ]
      }
    ]
  },
  {
    category: 'Логи доступа',
    items: [
      {
        method: 'GET',
        path: '/access-logs/',
        name: 'Получить логи доступа',
        queryParams: [
          { name: 'limit', type: 'number', required: true, label: 'Лимит (1-500)', defaultValue: '50' },
          { name: 'offset', type: 'number', required: true, label: 'Смещение', defaultValue: '0' }
        ]
      }
    ]
  },
  {
    category: 'Аутентификация',
    items: [
      {
        method: 'POST',
        path: '/auth/login',
        name: 'Войти (получить токен)',
        fields: [
          { name: 'username', type: 'text', required: true, label: 'Логин' },
          { name: 'password', type: 'password', required: true, label: 'Пароль' }
        ]
      },
      {
        method: 'POST',
        path: '/auth/register',
        name: 'Зарегистрировать сотрудника',
        fields: [
          { name: 'username', type: 'text', required: true, label: 'Логин' },
          { name: 'password', type: 'password', required: true, label: 'Пароль' }
        ]
      },
      {
        method: 'GET',
        path: '/auth/me',
        name: 'Получить текущего пользователя'
      },
      {
        method: 'DELETE',
        path: '/auth/staff/{staff_id}',
        name: 'Удалить сотрудника',
        pathParams: [
          { name: 'staff_id', type: 'number', required: true, label: 'ID сотрудника' }
        ]
      },
      {
        method: 'GET',
        path: '/auth/staff',
        name: 'Получить список сотрудников'
      }
    ]
  }
];

const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const isAdmin = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const decoded = JSON.parse(jsonPayload);
    return decoded.role === 'admin';
  } catch (e) {
    return false;
  }
};

const translateError = (errorObj) => {
  const translations = {
    'User with this telegram_id already exists': 'Пользователь с таким telegram_id уже существует',
    'User not found': 'Пользователь не найден',
    'Staff not found': 'Сотрудник не найден',
    'Username already registered': 'Пользователь с таким именем уже зарегистрирован',
    'Organization not found': 'Организация не найдена',
    'Organization with this name already exists': 'Организация с таким названием уже существует',
    'No active QR code found': 'Активный QR-код не найден',
    'QR code not found': 'QR-код не найден',
    'Invalid QR code format': 'Неверный формат QR-кода',
    'Cannot delete yourself': 'Нельзя удалить самого себя',
    'Access denied': 'Доступ запрещён',
    'Not authenticated': 'Не авторизован',
    'Invalid credentials': 'Неверные учетные данные'
  };
  
  if (typeof errorObj === 'object' && errorObj.detail) {
    return translations[errorObj.detail] || errorObj.detail;
  }
  
  if (typeof errorObj === 'object' && errorObj.message) {
    return translations[errorObj.message] || errorObj.message;
  }
  
  return errorObj;
};

const formatResponse = (data, isOk) => {
  if (typeof data === 'object' && data !== null) {
    if (data.detail && Object.keys(data).length === 1) {
      return translateError(data);
    }
    if (data.message && (data.status === 'invalid' || data.status === 'denied' || !isOk)) {
      return translateError(data);
    }
    return JSON.stringify(data, null, 2);
  }
  return data;
};

const ApiPanel = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }
  }, [navigate]);

  const handleSubmit = async (e, id) => {
    e.preventDefault();
    const [catIdx, itemIdx] = id.split('-');
    const ep = endpoints[catIdx].items[itemIdx];
    
    setLoading(prev => ({ ...prev, [id]: true }));
    setResponses(prev => ({ ...prev, [id]: 'Загрузка...' }));
    
    try {
      let url = API_BASE_URL + ep.path;
      
      ep.pathParams?.forEach(p => {
        const value = formData[`path-${id}-${p.name}`];
        if (value) {
          url = url.replace(`{${p.name}}`, value);
        }
      });
      
      const qp = new URLSearchParams();
      ep.queryParams?.forEach(p => {
        const val = formData[`query-${id}-${p.name}`];
        if (val) {
          qp.append(p.name, val);
        }
      });
      if (qp.toString()) url += '?' + qp;
      
      let body = null;
      if (ep.fields) {
        const data = {};
        ep.fields.forEach(f => {
          const val = formData[`field-${id}-${f.name}`];
          // Для опциональных полей отправляем только если значение заполнено
          if (val !== undefined && val !== null && val !== '') {
            data[f.name] = f.type === 'number' ? Number(val) : val;
          }
        });
        body = JSON.stringify(data);
      }

      const res = await fetch(url, {
        method: ep.method,
        headers: {
          ...getAuthHeaders(),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body
      });

      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = text; }
      
      if (res.ok && ep.method === 'DELETE') {
        if (res.status === 204 || !text || text.trim() === '') {
          setResponses(prev => ({ ...prev, [id]: 'Успешно удалено' }));
        } else {
          setResponses(prev => ({ ...prev, [id]: formatResponse(json, res.ok) }));
        }
      } else if (!res.ok) {
        // Обрабатываем ошибки
        const errorMsg = formatResponse(json, res.ok);
        setResponses(prev => ({ ...prev, [id]: errorMsg }));
      } else {
        setResponses(prev => ({ ...prev, [id]: formatResponse(json, res.ok) }));
      }
      
    } catch (err) {
      setResponses(prev => ({ ...prev, [id]: `Ошибка: ${err.message}` }));
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const getInputsHtml = (params = [], prefix, id) => {
    if (!params.length) return null;
    
    return (
      <div className="mb-3">
        {params.map((p, idx) => {
          const inputId = `${prefix}-${id}-${p.name}`;
          const isRequired = p.required !== false; // По умолчанию required = true, если не указано иное
          return (
            <div key={idx} className="form-group mb-2">
              <label className="form-label" htmlFor={inputId}>
                {p.label} {isRequired && <span className="text-danger">*</span>}
              </label>
              <input
                type={p.type === 'number' ? 'number' : p.type}
                className="form-control"
                id={inputId}
                required={isRequired}
                value={formData[inputId] || (p.defaultValue || '')}
                onChange={(e) => setFormData({ ...formData, [inputId]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const getCardHtml = (ep, id) => {
    return (
      <div key={id} className="card endpoint-card mb-3" id={`card-${id}`}>
        <div className="endpoint-header card-header d-flex align-items-center gap-2">
          <span>{ep.name}</span>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => handleSubmit(e, id)}>
            {getInputsHtml(ep.pathParams, 'path', id)}
            {getInputsHtml(ep.queryParams, 'query', id)}
            {getInputsHtml(ep.fields, 'field', id)}
            
            <button type="submit" className="btn btn-primary mb-3" id={`btn-${id}`} disabled={loading[id]}>
              {loading[id] ? 'Загрузка...' : 'Выполнить запрос'}
            </button>
            {responses[id] && (
              <pre 
                className={`response-area border rounded p-3 d-block ${
                  responses[id] === 'Загрузка...' || responses[id] === 'Успешно удалено' || (!String(responses[id]).includes('не найден') && !String(responses[id]).includes('запрещён') && !String(responses[id]).includes('ошибка'))
                    ? 'bg-light border-success' 
                    : 'bg-light border-danger'
                }`}
                id={`resp-${id}`}
              >
                {responses[id]}
              </pre>
            )}
          </form>
        </div>
      </div>
    );
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="container mb-5">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-2">Панель управления</h1>
          </div>
        </div>

        <div id="endpoints-container">
          {endpoints.map((cat, catIdx) => (
            <div key={catIdx} className="mb-5">
              <h4 className="mb-3">{cat.category}</h4>
              {cat.items.map((ep, itemIdx) => getCardHtml(ep, `${catIdx}-${itemIdx}`))}
            </div>
          ))}
        </div>
      </main>
    </>
  );
};

export default ApiPanel;
