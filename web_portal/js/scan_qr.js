const API_BASE_URL = `http://${window.location.hostname}:8000`;

const HISTORY_KEY = 'qr_scan_history';
const MAX_HISTORY_ITEMS = 10;

const form = document.getElementById('scan-qr-form');
const qrInput = document.getElementById('qr-input');
const checkBtn = document.getElementById('check-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const resultCardSuccess = document.getElementById('result-card-success');
const resultCardError = document.getElementById('result-card-error');
const resultSuccessMessage = document.getElementById('result-success-message');
const resultSuccessDetails = document.getElementById('result-success-details');
const resultErrorMessage = document.getElementById('result-error-message');
const qrError = document.getElementById('qr-error');

const toggleHistoryBtn = document.getElementById('toggle-history');
const historyChevron = document.getElementById('history-chevron');
const historyContainer = document.getElementById('history-container');
const historySearchContainer = document.getElementById('history-search-container');
const historySearch = document.getElementById('history-search');
const clearSearchBtn = document.getElementById('clear-search');
const clearAllHistoryBtn = document.getElementById('clear-all-history');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historyNoResults = document.getElementById('history-no-results');

let isHistoryExpanded = false;
let currentSearchQuery = '';

function showError(message) {
  qrInput.classList.add('is-invalid');
  qrError.textContent = message;
  qrError.style.display = 'block';
}

function clearError() {
  qrInput.classList.remove('is-invalid');
  qrError.textContent = '';
  qrError.style.display = 'none';
}

function hideResults() {
  resultCardSuccess.style.display = 'none';
  resultCardError.style.display = 'none';
}

function showLoading() {
  hideResults();
  checkBtn.disabled = true;
  clearBtn.disabled = true;
  qrInput.disabled = true;
  loadingIndicator.style.display = 'block';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
  checkBtn.disabled = false;
  clearBtn.disabled = false;
  qrInput.disabled = false;
}

function showResult(success, message, data = null) {
  hideLoading();
  hideResults();
  
  if (success) {
    resultSuccessMessage.textContent = message;
    
    let details = '';
    if (data) {
      if (data.name) details += `<div class="small mb-2"><strong>ФИО:</strong> ${escapeHtml(data.name)}</div>`;
      if (data.user_id) details += `<div class="small mb-2"><strong>ID:</strong> ${escapeHtml(String(data.user_id))}</div>`;
      if (data.organization) details += `<div class="small mb-2"><strong>Организация:</strong> ${escapeHtml(data.organization)}</div>`;
      if (data.role) details += `<div class="small mb-2"><strong>Должность:</strong> ${escapeHtml(data.role)}</div>`;
      if (data.telegram_id) details += `<div class="small mb-2"><strong>Telegram ID:</strong> ${escapeHtml(String(data.telegram_id))}</div>`;
      
      if (data.access_granted !== undefined) {
        const status = data.access_granted ? 'Разрешён' : 'Запрещён';
        const statusClass = data.access_granted ? 'text-success' : 'text-danger';
        details += `<div class="small mb-2"><strong>Статус доступа:</strong> <span class="${statusClass}">${status}</span></div>`;
      }
      
      if (data.timestamp) {
        const date = new Date(data.timestamp);
        const time = date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        details += `<div class="small text-muted mt-2 pt-2" style="border-top: 1px solid rgba(16, 185, 129, 0.1);"><strong>Время проверки:</strong> ${time}</div>`;
      }
    }
    resultSuccessDetails.innerHTML = details;
    resultCardSuccess.style.display = 'block';
  } else {
    resultErrorMessage.textContent = message;
    resultCardError.style.display = 'block';
  }
}

function validateQRCode() {
  const qrValue = qrInput.value.trim();
  
  if (!qrValue) {
    showError('Введите QR-код для проверки');
    return false;
  }
  
  if (qrValue.length < 5) {
    showError('QR-код слишком короткий (минимум 5 символов)');
    return false;
  }
  
  clearError();
  return true;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function checkQRCode(qrCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/qr/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_data: qrCode.trim(), scanner_id: 'web_portal' })
    });
    const data = await response.json();
    if (response.ok && data.status === 'granted' && data.user_info) {
      const userInfo = data.user_info;
      
      let orgName = 'Не указана';
      try {
        const orgRes = await fetch(`${API_BASE_URL}/organizations/`);
        if (orgRes.ok) {
          const orgs = await orgRes.json();
          const org = orgs.find(o => o.id === userInfo.organization_id);
          if (org) orgName = org.name;
        }
      } catch (e) {
        console.warn('Ошибка получения организации:', e);
      }
      let msg = data.message || 'QR-код действителен. Доступ разрешён.';
      msg = msg.replace(/^\s*access\s+granted\s*[.,]?\s*/gi, '').trim();
      if (!msg) msg = 'QR-код действителен. Доступ разрешён.';
      return {
        success: true,
        message: msg,
        data: {
          user_id: userInfo.id,
          name: userInfo.name,
          organization: orgName,
          organization_id: userInfo.organization_id,
          role: 'Пользователь',
          telegram_id: userInfo.telegram_id,
          access_granted: true,
          timestamp: new Date().toISOString(),
          user: userInfo.name
        }
      };
    } else {
      let errMsg = 'QR-код недействителен или доступ запрещён.';
      if (data.message) {
        const msg = data.message.toLowerCase();
        if (msg.includes('expired')) errMsg = 'QR-код истёк.';
        else if (msg.includes('already used')) errMsg = 'QR-код уже был использован.';
        else if (msg.includes('not found')) errMsg = 'QR-код не найден в системе.';
        else if (msg.includes('user not found')) errMsg = 'Пользователь не найден.';
        else if (msg.includes('invalid') || msg.includes('format')) errMsg = 'Неверный формат QR-кода.';
        else if (msg.includes('rate limit')) errMsg = 'Превышен лимит запросов. Попробуйте позже.';
        else errMsg = data.message;
      }
      return { success: false, message: errMsg };
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
    return { success: false, message: 'Ошибка сети. Проверьте подключение к серверу.' };
  }
}

function getHistory() {
  try {
    const json = localStorage.getItem(HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Ошибка чтения истории:', e);
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Ошибка сохранения истории:', e);
  }
}

function saveToHistory(qrCode, success, message, data, user) {
  const history = getHistory();
  const filtered = history.filter(item => item.qrCode !== qrCode);
  
  filtered.unshift({
    qrCode: qrCode,
    success: success,
    message: message,
    user: user,
    timestamp: new Date().toISOString(),
    data: data || null
  });
  
  saveHistory(filtered.slice(0, MAX_HISTORY_ITEMS));
  
  if (isHistoryExpanded) renderHistory();
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncateText(text, maxLen = 60) {
  return text.length <= maxLen ? text : text.substring(0, maxLen) + '...';
}

function filterHistory(history, query) {
  if (!query.trim()) return history;
  const q = query.toLowerCase().trim();
  return history.filter(item => item.qrCode.toLowerCase().includes(q) || item.message.toLowerCase().includes(q));
}

function renderHistory() {
  const history = getHistory();
  const filtered = filterHistory(history, currentSearchQuery);
  
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyEmpty.style.display = 'block';
    historyNoResults.style.display = 'none';
    historyList.style.display = 'none';
    clearAllHistoryBtn.style.display = 'none';
    return;
  }
  
  if (isHistoryExpanded) clearAllHistoryBtn.style.display = 'block';
  historyEmpty.style.display = 'none';
  
  if (filtered.length === 0) {
    historyNoResults.style.display = 'block';
    historyList.style.display = 'none';
    return;
  }
  
  historyNoResults.style.display = 'none';
  historyList.style.display = 'block';
  
  filtered.forEach(item => {
    const li = document.createElement('div');
    li.className = 'list-group-item list-group-item-action qr-history-item';
    li.style.cursor = 'pointer';
    
    const statusClass = item.success ? 'text-success' : 'text-danger';
    const statusIcon = item.success ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
    const statusText = item.success ? 'Успех' : 'Отказ';
    
    let msg = item.message || '';
    msg = msg.replace(/access\s+granted/gi, 'QR-код действителен. Доступ разрешён.');
    msg = msg.trim() || 'QR-код действителен. Доступ разрешён.';
    
    li.innerHTML = `
      <div class="d-flex align-items-start">
        <div class="qr-history-icon me-3 ${statusClass}">
          <i class="bi ${statusIcon}" style="font-size: 1.25rem;"></i>
        </div>
        <div class="flex-grow-1" style="min-width: 0;">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div class="fw-semibold text-truncate" style="font-size: 0.875rem; font-family: 'Courier New', monospace;" title="${escapeHtml(item.qrCode)}">
              ${escapeHtml(truncateText(item.qrCode, 50))}
            </div>
            <small class="text-muted ms-2">${formatTime(item.timestamp)}</small>
          </div>
          <div class="small ${statusClass} mb-1">
            <i class="bi ${statusIcon} me-1"></i>${statusText}
          </div>
          <div class="small text-muted text-truncate" title="${escapeHtml(msg)}">
            ${escapeHtml(truncateText(msg, 80))}
          </div>
          ${item.user ? `<div class="small text-muted text-truncate"><strong>Пользователь:</strong> ${escapeHtml(truncateText(item.user, 80))}</div>` : ''}
        </div>
        <div class="d-flex gap-1 ms-2">
          <button type="button" class="btn btn-sm btn-outline-primary use-btn" data-qr="${item.qrCode}" title="Использовать">
            <i class="bi bi-arrow-return-left"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-qr="${item.qrCode}" title="Удалить">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;
    
    li.querySelector('.use-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      qrInput.value = item.qrCode;
      clearError();
      hideResults();
      setTimeout(() => qrInput.focus(), 100);
    });
    
    li.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Удалить этот элемент из истории?')) {
        const h = getHistory().filter(i => i.qrCode !== item.qrCode);
        saveHistory(h);
        renderHistory();
      }
    });
    
    historyList.appendChild(li);
  });
}

function toggleHistory() {
  isHistoryExpanded = !isHistoryExpanded;
  
  if (isHistoryExpanded) {
    historyContainer.style.display = 'block';
    historySearchContainer.style.display = 'block';
    historyChevron.classList.remove('bi-chevron-down');
    historyChevron.classList.add('bi-chevron-up');
    const history = getHistory();
    clearAllHistoryBtn.style.display = history.length > 0 ? 'block' : 'none';
    renderHistory();
  } else {
    historyContainer.style.display = 'none';
    historySearchContainer.style.display = 'none';
    historyChevron.classList.remove('bi-chevron-up');
    historyChevron.classList.add('bi-chevron-down');
    clearAllHistoryBtn.style.display = 'none';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateQRCode()) return;
  
  const qrCode = qrInput.value.trim();
  showLoading();
  clearError();
  
  const result = await checkQRCode(qrCode);
  showResult(result.success, result.message, result.data);
  saveToHistory(qrCode, result.success, result.message, result.data, result.data?.user);
});

clearBtn.addEventListener('click', () => {
  qrInput.value = '';
  clearError();
  hideResults();
  qrInput.focus();
});

window.addEventListener('load', () => qrInput.focus());

qrInput.addEventListener('input', () => {
  if (qrInput.classList.contains('is-invalid')) clearError();
  hideResults();
});

toggleHistoryBtn.addEventListener('click', toggleHistory);

clearAllHistoryBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const history = getHistory();
  if (history.length === 0) return;
  if (confirm(`Удалить всю историю (${history.length} элементов)?`)) {
    saveHistory([]);
    renderHistory();
    clearAllHistoryBtn.style.display = 'none';
  }
});

historySearch.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value;
  clearSearchBtn.style.display = currentSearchQuery.trim() ? 'block' : 'none';
  renderHistory();
});

clearSearchBtn.addEventListener('click', () => {
  historySearch.value = '';
  currentSearchQuery = '';
  clearSearchBtn.style.display = 'none';
  renderHistory();
});
