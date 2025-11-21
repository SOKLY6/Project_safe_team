(function() {
  'use strict';

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

  const API_BASE_URL = `http://${window.location.hostname}:8000`;


  const HISTORY_KEY = 'qr_scan_history';
  const MAX_HISTORY_ITEMS = 10;

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
    resultCardSuccess.classList.remove('qr-result-show');
    resultCardError.classList.remove('qr-result-show');
  }

  function showLoading() {
    hideResults();
    
    checkBtn.disabled = true;
    clearBtn.disabled = true;
    qrInput.disabled = true;
    
    loadingIndicator.style.display = 'block';
    loadingIndicator.style.visibility = 'visible';
    loadingIndicator.style.opacity = '0';
    loadingIndicator.classList.remove('qr-loading-show');
    
    void loadingIndicator.offsetHeight;
    
    setTimeout(() => {
      loadingIndicator.classList.add('qr-loading-show');
    }, 10);
  }

  function hideLoading() {
    loadingIndicator.classList.remove('qr-loading-show');
    setTimeout(() => {
      loadingIndicator.style.display = 'none';
      loadingIndicator.style.opacity = '';
      loadingIndicator.style.visibility = '';
    }, 300);
    checkBtn.disabled = false;
    clearBtn.disabled = false;
    qrInput.disabled = false;
  }

  function showResult(success, message, data = null) {
    hideLoading();
    hideResults();
    
    if (success) {
      resultSuccessMessage.textContent = message;
      
      if (data) {
        let detailsHtml = '<div class="qr-result-details mt-3 pt-3" style="border-top: 1px solid rgba(16, 185, 129, 0.2);">';
        
        if (data.name) {
          detailsHtml += `<div class="small mb-2"><strong>ФИО:</strong> ${escapeHtml(data.name)}</div>`;
        }
        
        if (data.user_id) {
          detailsHtml += `<div class="small mb-2"><strong>ID:</strong> ${escapeHtml(String(data.user_id))}</div>`;
        }
        
        if (data.organization) {
          detailsHtml += `<div class="small mb-2"><strong>Организация:</strong> ${escapeHtml(data.organization)}</div>`;
        }
        
        if (data.role) {
          detailsHtml += `<div class="small mb-2"><strong>Должность:</strong> ${escapeHtml(data.role)}</div>`;
        }
        
        if (data.telegram_id) {
          detailsHtml += `<div class="small mb-2"><strong>Telegram ID:</strong> ${escapeHtml(String(data.telegram_id))}</div>`;
        }
        
        if (data.access_granted !== undefined) {
          const accessStatus = data.access_granted ? 'Разрешён' : 'Запрещён';
          const accessClass = data.access_granted ? 'text-success' : 'text-danger';
          detailsHtml += `<div class="small mb-2"><strong>Статус доступа:</strong> <span class="${accessClass}">${accessStatus}</span></div>`;
        }
        
        if (data.timestamp) {
          const date = new Date(data.timestamp);
          const formattedTime = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          detailsHtml += `<div class="small text-muted mt-2 pt-2" style="border-top: 1px solid rgba(16, 185, 129, 0.1);"><strong>Время проверки:</strong> ${formattedTime}</div>`;
        }
        
        detailsHtml += '</div>';
        resultSuccessDetails.innerHTML = detailsHtml;
      } else {
        resultSuccessDetails.innerHTML = '';
      }
      
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

  function normalizeQRCode(qrCode) {
    return qrCode.trim().replace(/\s+/g, ' ');
  }

  function extractToken(qrCode) {
    return qrCode.trim();
  }

  async function checkQRCode(qrCode) {
    const normalizedQR = normalizeQRCode(qrCode);

    try {
      const token = extractToken(normalizedQR);

      const response = await fetch(`${API_BASE_URL}/qr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_data: token,
          scanner_id: 'web_portal'
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'granted' && data.user_info) {
        const userInfo = data.user_info;
        
        let organizationName = 'Не указана';
        if (userInfo.organization_id) {
          try {
            const orgResponse = await fetch(`${API_BASE_URL}/organizations/`);
            if (orgResponse.ok) {
              const organizations = await orgResponse.json();
              const org = organizations.find(o => o.id === userInfo.organization_id);
              if (org) {
                organizationName = org.name;
              }
            }
          } catch (e) {
            console.warn('Не удалось получить название организации:', e);
          }
        }

        let message = data.message || '';
        
        if (!message || message.toLowerCase().trim() === 'access granted') {
          message = 'QR-код действителен. Доступ разрешён.';
        } else {
          message = message.replace(/^\s*access\s+granted\s*[.,]?\s*/gi, '');
          message = message.replace(/\s*[.,]?\s*access\s+granted\s*$/gi, '');
          message = message.trim();
          
          if (!message) {
            message = 'QR-код действителен. Доступ разрешён.';
          } else {
            message = 'QR-код действителен. Доступ разрешён. ' + message;
          }
        }
        
        return {
          success: true,
          message: message,
          data: {
            user_id: userInfo.id,
            name: userInfo.name,
            organization: organizationName,
            organization_id: userInfo.organization_id,
            role: 'Пользователь',
            telegram_id: userInfo.telegram_id,
            access_granted: true,
            timestamp: new Date().toISOString(),
            user: userInfo.name
          }
        };
      } else {
        let errorMessage = 'QR-код недействителен или доступ запрещён.';
        if (data.message) {
          const message = data.message.toLowerCase();
          if (message.includes('expired')) {
            errorMessage = 'QR-код истёк.';
          } else if (message.includes('already used')) {
            errorMessage = 'QR-код уже был использован.';
          } else if (message.includes('not found')) {
            errorMessage = 'QR-код не найден в системе.';
          } else if (message.includes('user not found')) {
            errorMessage = 'Пользователь не найден.';
          } else if (message.includes('invalid') || message.includes('format')) {
            errorMessage = 'Неверный формат QR-кода.';
          } else if (message.includes('rate limit')) {
            errorMessage = 'Превышен лимит запросов. Попробуйте позже.';
          } else if (message.includes('access denied') || message.includes('доступ запрещён')) {
            errorMessage = 'Доступ запрещён';
          } else {
            errorMessage = data.message;
          }
        }
        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      console.error('Ошибка при запросе:', error);
      return {
        success: false,
        message: 'Ошибка сети. Проверьте подключение к серверу.'
      };
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateQRCode()) {
      return;
    }

    const qrCode = qrInput.value.trim();
    showLoading();
    clearError();

    const [result] = await Promise.all([
      checkQRCode(qrCode),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
    
    let displayMessage = result.message || 'QR-код действителен. Доступ разрешён.';
    
    displayMessage = displayMessage.replace(/(Доступ разрешён\.?\s*){2,}/gi, 'Доступ разрешён.');
    displayMessage = displayMessage.trim();
    
    showResult(result.success, displayMessage, result.data);
    
    const user = result.data?.user;
    saveToHistory(qrCode, result.success, displayMessage, result.data, user);
  });

  clearBtn.addEventListener('click', function() {
    clearForm();
  });

  function clearForm() {
    qrInput.value = '';
    clearError();
    hideResults();
    qrInput.focus();
  }

  window.addEventListener('load', function() {
    qrInput.focus();
  });

  qrInput.addEventListener('input', function() {
    if (qrInput.classList.contains('is-invalid')) {
      clearError();
    }
    hideResults();
  });

  qrInput.addEventListener('paste', function(e) {
    setTimeout(() => {
      const pastedText = qrInput.value.trim();
      if (pastedText.length > 0) {
        clearError();
      }
    }, 10);
  });


  function getHistory() {
    try {
      const historyJson = localStorage.getItem(HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
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
    
    const filteredHistory = history.filter(item => item.qrCode !== qrCode);
    
    const newItem = {
      qrCode: qrCode,
      success: success,
      message: message,
      user: user,
      timestamp: new Date().toISOString(),
      data: data || null
    };
    
    filteredHistory.unshift(newItem);
    
    const limitedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);
    
    saveHistory(limitedHistory);
    
    if (isHistoryExpanded) {
      renderHistory();
    }
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
    
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function truncateText(text, maxLength = 60) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function filterHistory(history, searchQuery) {
    if (!searchQuery.trim()) return history;
    
    const query = searchQuery.toLowerCase().trim();
    return history.filter(item => {
      const qrLower = item.qrCode.toLowerCase();
      const messageLower = item.message.toLowerCase();
      return qrLower.includes(query) || messageLower.includes(query);
    });
  }

  function renderHistory() {
    const history = getHistory();
    const filteredHistory = filterHistory(history, currentSearchQuery);
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
      historyEmpty.style.display = 'block';
      historyNoResults.style.display = 'none';
      historyList.style.display = 'none';
      clearAllHistoryBtn.style.display = 'none';
      return;
    }
    
    if (isHistoryExpanded) {
      clearAllHistoryBtn.style.display = 'block';
    }
    
    historyEmpty.style.display = 'none';
    
    if (filteredHistory.length === 0) {
      historyNoResults.style.display = 'block';
      historyList.style.display = 'none';
      return;
    }
    
    historyNoResults.style.display = 'none';
    historyList.style.display = 'block';
    
    filteredHistory.forEach((item, index) => {
      const listItem = document.createElement('div');
      listItem.className = 'list-group-item list-group-item-action qr-history-item';
      listItem.style.cursor = 'pointer';
      
      const statusClass = item.success ? 'text-success' : 'text-danger';
      const statusIcon = item.success ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
      const statusText = item.success ? 'Успех' : 'Отказ';
      
      const escapedQrCode = escapeHtml(item.qrCode);
      
      let displayMessage = item.message || '';
      displayMessage = displayMessage.replace(/access\s+granted/gi, 'QR-код действителен. Доступ разрешён.');
      displayMessage = displayMessage.replace(/QR-код действителен\. Доступ разрешён\.\s*QR-код действителен\. Доступ разрешён\./gi, 'QR-код действителен. Доступ разрешён.');
      displayMessage = displayMessage.trim();
      if (!displayMessage) {
        displayMessage = 'QR-код действителен. Доступ разрешён.';
      }
      const escapedMessage = escapeHtml(displayMessage);
      
      listItem.innerHTML = `
        <div class="d-flex align-items-start">
          <div class="qr-history-icon me-3 ${statusClass}">
            <i class="bi ${statusIcon}" style="font-size: 1.25rem;"></i>
          </div>
          <div class="flex-grow-1" style="min-width: 0;">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <div class="fw-semibold text-truncate" style="font-size: 0.875rem; font-family: 'Courier New', monospace;" title="${escapedQrCode}">
                ${escapeHtml(truncateText(item.qrCode, 50))}
              </div>
              <small class="text-muted ms-2" style="white-space: nowrap;">${formatTime(item.timestamp)}</small>
            </div>
            <div class="small ${statusClass} mb-1">
              <i class="bi ${statusIcon} me-1"></i>${statusText}
            </div>
            <div class="small text-muted text-truncate" title="${escapedMessage}">
              ${escapeHtml(truncateText(displayMessage, 80))}
            </div>
            ${item.user ? `<div class="small text-muted text-truncate" title="${escapeHtml(item.user)}">
              <strong>Пользователь:</strong> ${escapeHtml(truncateText(item.user, 80))}
            </div>` : ''}
          </div>
          <div class="d-flex gap-1 ms-2">
            <button type="button" class="btn btn-sm btn-outline-primary qr-history-use-btn" 
                    data-qr="${item.qrCode.replace(/"/g, '&quot;').replace(/&/g, '&amp;')}" 
                    title="Использовать этот QR-код">
              <i class="bi bi-arrow-return-left"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger qr-history-delete-btn" 
                    data-qr="${item.qrCode.replace(/"/g, '&quot;').replace(/&/g, '&amp;')}" 
                    title="Удалить из истории">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
      `;
      
      listItem.addEventListener('click', function(e) {
        const target = e.target;
        const isButton = target.closest('.qr-history-use-btn') || 
                        target.closest('.qr-history-delete-btn') ||
                        target.classList.contains('bi-arrow-return-left') ||
                        target.classList.contains('bi-x') ||
                        target.tagName === 'BUTTON';
        if (!isButton) {
          useFromHistory(item.qrCode);
        }
      });
      
      const useBtn = listItem.querySelector('.qr-history-use-btn');
      if (useBtn) {
        useBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          useFromHistory(item.qrCode);
          return false;
        });
      }
      
      const deleteBtn = listItem.querySelector('.qr-history-delete-btn');
      deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteHistoryItem(item.qrCode);
      });
      
      historyList.appendChild(listItem);
    });
  }

  function useFromHistory(qrCode) {
    qrInput.value = qrCode;
    clearError();
    hideResults();
    
    setTimeout(() => {
      qrInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      qrInput.focus();
    }, 100);
  }

  function deleteHistoryItem(qrCode) {
    if (!confirm('Удалить этот элемент из истории?')) {
      return;
    }
    
    const history = getHistory();
    const filteredHistory = history.filter(item => item.qrCode !== qrCode);
    saveHistory(filteredHistory);
    renderHistory();
    
    if (filteredHistory.length === 0) {
      clearAllHistoryBtn.style.display = 'none';
    }
  }

  function clearAllHistory() {
    const history = getHistory();
    if (history.length === 0) {
      return;
    }
    
    if (!confirm(`Удалить всю историю проверок (${history.length} элементов)?`)) {
      return;
    }
    
    saveHistory([]);
    renderHistory();
    clearAllHistoryBtn.style.display = 'none';
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

  toggleHistoryBtn.addEventListener('click', toggleHistory);
  
  clearAllHistoryBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    clearAllHistory();
  });
  
  historySearch.addEventListener('input', function(e) {
    currentSearchQuery = e.target.value;
    if (currentSearchQuery.trim()) {
      clearSearchBtn.style.display = 'block';
    } else {
      clearSearchBtn.style.display = 'none';
    }
    renderHistory();
  });
  
  clearSearchBtn.addEventListener('click', function() {
    historySearch.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderHistory();
  });

})();
