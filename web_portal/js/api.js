(function() {
  'use strict';

  const API_BASE_URL = `http://${window.location.hostname}:8000`;

  const endpoints = [
    {
      category: 'Пользователи',
      items: [
        {
          method: 'POST',
          path: '/users/post',
          name: 'Создать пользователя',
          fields: [
            { name: 'telegram_id', type: 'number', required: true, label: 'Telegram ID' },
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
            { name: 'organization_id', type: 'number', required: true, label: 'ID организации' }
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

  class ApiTester {
    constructor() {
      if (!window.authUtils?.isAdmin()) return window.location.href = 'dashboard.html';
      
      document.getElementById('staff-nav-link')?.style.setProperty('display', 'block');
      document.getElementById('api-nav-link')?.style.setProperty('display', 'block');
      
      this.render();
    }

    render() {
      const html = endpoints.map((cat, catIdx) => `
        <div class="mb-5">
          <h4 class="mb-3">${cat.category}</h4>
          ${cat.items.map((ep, itemIdx) => this.getCardHtml(ep, `${catIdx}-${itemIdx}`)).join('')}
        </div>
      `).join('');
      
      document.getElementById('endpoints-container').innerHTML = html;
    }

    getCardHtml(ep, id) {
      return `
        <div class="card endpoint-card mb-3" id="card-${id}">
          <div class="endpoint-header card-header d-flex align-items-center gap-2">
            <span class="badge method-badge method-${ep.method.toLowerCase()}">${ep.method}</span>
            <code class="flex-grow-1">${ep.path}</code>
            <span>${ep.name}</span>
          </div>
          <div class="card-body">
            <form onsubmit="apiTester.submit(event, '${id}')">
              ${this.getInputsHtml(ep.pathParams, 'path', id)}
              ${this.getInputsHtml(ep.queryParams, 'query', id)}
              ${this.getInputsHtml(ep.fields, 'field', id)}
              
              <button type="submit" class="btn btn-primary mb-3" id="btn-${id}">Выполнить запрос</button>
              <pre class="response-area bg-light border rounded p-3 d-none" id="resp-${id}"></pre>
            </form>
          </div>
        </div>`;
    }

    getInputsHtml(params = [], prefix, id) {
      if (!params.length) return '';
      return `<div class="mb-3">` + params.map(p => {
        const inputId = `${prefix}-${id}-${p.name}`;
        const label = `${p.label} <span class="text-danger">*</span>`;
        
        let input = '';
        if (p.type === 'select') {
          input = `<select class="form-control" id="${inputId}" required>
            ${p.options.map(o => `<option value="${o}" ${p.defaultValue === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>`;
        } else {
          input = `<input type="${p.type}" class="form-control" id="${inputId}" required value="${p.defaultValue || ''}">`;
        }
        
        return `<div class="form-group mb-2"><label class="form-label" for="${inputId}">${label}</label>${input}</div>`;
      }).join('') + `</div>`;
    }

    async submit(e, id) {
      e.preventDefault();
      const btn = document.getElementById(`btn-${id}`);
      const resp = document.getElementById(`resp-${id}`);
      const [catIdx, itemIdx] = id.split('-');
      const ep = endpoints[catIdx].items[itemIdx];
      btn.disabled = true;
      resp.textContent = 'Загрузка...';
      resp.className = 'response-area bg-light border rounded p-3 d-block';
      try {
        let url = API_BASE_URL + ep.path;
        
        ep.pathParams?.forEach(p => {
          url = url.replace(`{${p.name}}`, document.getElementById(`path-${id}-${p.name}`).value);
        });
        
        const qp = new URLSearchParams();
        ep.queryParams?.forEach(p => {
          const val = document.getElementById(`query-${id}-${p.name}`).value;
          qp.append(p.name, val);
        });
        if (qp.toString()) url += '?' + qp;
        
        let body = null;
        if (ep.fields) {
          const data = {};
          ep.fields.forEach(f => {
            const val = document.getElementById(`field-${id}-${f.name}`).value;
            data[f.name] = f.type === 'number' ? Number(val) : val;
          });
          body = JSON.stringify(data);
        }

        const res = await fetch(url, {
          method: ep.method,
          headers: {
            ...window.authUtils.getAuthHeaders(),
            ...(body ? { 'Content-Type': 'application/json' } : {})
          },
          body
        });

        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch { json = text; }
        
        // Для успешных DELETE запросов показываем сообщение об успехе
        if (res.ok && ep.method === 'DELETE') {
          if (res.status === 204 || !text || text.trim() === '') {
            resp.textContent = 'Успешно удалено';
          } else {
            resp.textContent = typeof json === 'object' ? JSON.stringify(json, null, 2) : json;
          }
        } else {
          resp.textContent = typeof json === 'object' ? JSON.stringify(json, null, 2) : json;
        }
        
        resp.className = `response-area border rounded p-3 d-block ${res.ok ? 'bg-light border-success' : 'bg-light border-danger'}`;
        
      } catch (err) {
        resp.textContent = err.message;
        resp.className = 'response-area bg-light border border-danger rounded p-3 d-block';
      } finally {
        btn.disabled = false;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => { window.apiTester = new ApiTester(); });
})();
