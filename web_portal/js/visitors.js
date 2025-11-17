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
  const ITEMS_PER_PAGE = 50;
  const SCROLL_THRESHOLD = 200;

  // Элементы DOM
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const tableContainer = document.getElementById('table-container');
  const usersTbody = document.getElementById('users-tbody');
  const loadingMore = document.getElementById('loading-more');
  const noMoreData = document.getElementById('no-more-data');
  const noData = document.getElementById('no-data');
  const refreshBtn = document.getElementById('refresh-btn');
  const exportBtn = document.getElementById('export-btn');
  
  // Элементы фильтров
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const organizationFilter = document.getElementById('organization-filter');
  const searchNameInput = document.getElementById('search-name');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const activeFiltersCount = document.getElementById('active-filters-count');
  const filtersCountSpan = document.getElementById('filters-count');

  // Состояние
  let allUsers = [];
  let filteredUsers = [];
  let organizations = [];
  let currentPage = 0;
  let isLoading = false;
  let hasMoreData = true;
  let currentFilters = {
    dateFrom: null,
    dateTo: null,
    organization: 'all',
    searchName: ''
  };


  // Инициализация
  document.addEventListener('DOMContentLoaded', function() {
    loadOrganizations();
    loadUsers();
    
    // Обработчики событий
    refreshBtn.addEventListener('click', refreshUsers);
    exportBtn.addEventListener('click', exportToCSV);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    searchNameInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Бесконечный скролл
    window.addEventListener('scroll', handleScroll);
  });

  // Обработка скролла для бесконечной загрузки
  function handleScroll() {
    if (isLoading || !hasMoreData) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      loadMoreUsers();
    }
  }

  // Загрузка всех пользователей из access_logs
  async function loadUsers() {
    showLoading();
    hideError();
    hideTable();

    try {
      // Получаем все access logs из API
      const response = await fetch(`${API_BASE_URL}/access-logs/?limit=500`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Ошибка загрузки данных:', response.status, response.statusText);
        showError(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        hideLoading();
        return;
      }

      const accessLogs = await response.json();
      
      // Группируем логи по пользователям и вычисляем статистику
      const usersMap = new Map();

      accessLogs.forEach(log => {
        if (!log.user_id || !log.user_name) return; // Пропускаем логи без пользователя

        const userId = log.user_id;
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            name: log.user_name || 'Неизвестно',
            organization_id: log.organization_id,
            organization_name: log.organization_name || 'Не указана',
            firstAccess: new Date(log.timestamp),
            lastAccess: new Date(log.timestamp),
            totalVisits: 0,
            grantedCount: 0,
            deniedCount: 0
          });
        }

        const user = usersMap.get(userId);
        const logDate = new Date(log.timestamp);

        // Обновляем первый вход (самое раннее время)
        if (logDate < user.firstAccess) {
          user.firstAccess = logDate;
        }

        // Обновляем последний вход (самое позднее время)
        if (logDate > user.lastAccess) {
          user.lastAccess = logDate;
        }

        // Подсчитываем визиты
        user.totalVisits++;
        if (log.access_granted) {
          user.grantedCount++;
        } else {
          user.deniedCount++;
        }
      });

      // Преобразуем Map в массив
      allUsers = Array.from(usersMap.values());

      // Сортируем по последнему входу (новые сверху)
      allUsers = allUsers.sort((a, b) => {
        return b.lastAccess.getTime() - a.lastAccess.getTime();
      });

      // Применяем текущие фильтры
      applyFilters();
      
      hideLoading();
      showTable();

    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      showError(`Ошибка подключения к серверу: ${error.message}`);
      hideLoading();
    }
  }

  // Загрузка организаций для фильтра
  async function loadOrganizations() {
    try {
      const orgsResponse = await fetch(`${API_BASE_URL}/organizations/`);
      if (!orgsResponse.ok) {
        console.error('Ошибка загрузки организаций:', orgsResponse.status, orgsResponse.statusText);
        return;
      }
      
      organizations = await orgsResponse.json();
      
      // Заполняем селект организаций
      organizationFilter.innerHTML = '<option value="all">Все</option>';
      organizations.forEach(org => {
        const option = document.createElement('option');
        option.value = org.id;
        option.textContent = org.name;
        organizationFilter.appendChild(option);
      });
    } catch (e) {
      console.error('Ошибка загрузки организаций:', e);
    }
  }

  // Загрузка дополнительных пользователей (для бесконечного скролла)
  async function loadMoreUsers() {
    if (isLoading || !hasMoreData) return;

    const nextPage = currentPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    if (startIndex >= filteredUsers.length) {
      hasMoreData = false;
      showNoMoreData();
      return;
    }

    isLoading = true;
    showLoadingMore();

    // Имитация задержки для плавности
    await new Promise(resolve => setTimeout(resolve, 300));

    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    renderUsersPage(pageUsers);
    
    currentPage = nextPage;
    hasMoreData = endIndex < filteredUsers.length;

    isLoading = false;
    hideLoadingMore();

    if (!hasMoreData) {
      showNoMoreData();
    }
  }

  // Применение фильтров
  function applyFilters() {
    // Получаем значения фильтров
    currentFilters.dateFrom = dateFromInput.value || null;
    currentFilters.dateTo = dateToInput.value || null;
    currentFilters.organization = organizationFilter.value;
    currentFilters.searchName = searchNameInput.value.trim().toLowerCase();

    // Фильтруем пользователей
    filteredUsers = allUsers.filter(user => {
      // Фильтр по дате от (проверяем последний вход)
      if (currentFilters.dateFrom) {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        if (lastAccessDate < currentFilters.dateFrom) {
          return false;
        }
      }

      // Фильтр по дате до (проверяем последний вход)
      if (currentFilters.dateTo) {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        if (lastAccessDate > currentFilters.dateTo) {
          return false;
        }
      }

      // Фильтр по организации
      if (currentFilters.organization !== 'all') {
        const orgId = parseInt(currentFilters.organization);
        if (user.organization_id !== orgId) {
          return false;
        }
      }

      // Поиск по ФИО
      if (currentFilters.searchName) {
        const userName = (user.name || '').toLowerCase();
        if (!userName.includes(currentFilters.searchName)) {
          return false;
        }
      }

      return true;
    });

    // Сортируем отфильтрованных пользователей по последнему входу (новые сверху)
    filteredUsers = filteredUsers.sort((a, b) => {
      return b.lastAccess.getTime() - a.lastAccess.getTime();
    });

    // Обновляем счетчик активных фильтров
    updateFiltersCount();

    // Перерисовываем таблицу
    currentPage = 0;
    hasMoreData = filteredUsers.length > 0;
    renderUsers();
  }

  // Очистка фильтров
  function clearFilters() {
    dateFromInput.value = '';
    dateToInput.value = '';
    organizationFilter.value = 'all';
    searchNameInput.value = '';
    
    currentFilters = {
      dateFrom: null,
      dateTo: null,
      organization: 'all',
      searchName: ''
    };

    applyFilters();
  }

  // Обновление счетчика активных фильтров
  function updateFiltersCount() {
    let count = 0;
    if (currentFilters.dateFrom) count++;
    if (currentFilters.dateTo) count++;
    if (currentFilters.organization !== 'all') count++;
    if (currentFilters.searchName) count++;

    filtersCountSpan.textContent = count;
    activeFiltersCount.style.display = count > 0 ? 'block' : 'none';
  }

  // Отображение всех пользователей (первая страница)
  function renderUsers() {
    usersTbody.innerHTML = '';
    noData.style.display = filteredUsers.length === 0 ? 'block' : 'none';
    
    if (filteredUsers.length === 0) {
      hasMoreData = false;
      return;
    }

    const firstPageUsers = filteredUsers.slice(0, ITEMS_PER_PAGE);
    renderUsersPage(firstPageUsers);
    
    currentPage = 0;
    hasMoreData = filteredUsers.length > ITEMS_PER_PAGE;
    
    if (!hasMoreData) {
      showNoMoreData();
    }
  }

  // Отображение страницы пользователей
  function renderUsersPage(users) {
    users.forEach(user => {
      const row = createUserRow(user);
      usersTbody.appendChild(row);
    });
  }

  // Создание строки таблицы для пользователя
  function createUserRow(user) {
    const row = document.createElement('tr');
    
    // Форматирование дат
    const formatDate = (date) => {
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const firstAccessFormatted = formatDate(user.firstAccess);
    const lastAccessFormatted = formatDate(user.lastAccess);

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(user.name)}</strong>
      </td>
      <td>${escapeHtml(user.organization_name)}</td>
      <td>
        <small class="text-muted">${firstAccessFormatted}</small>
      </td>
      <td>
        <small class="text-muted">${lastAccessFormatted}</small>
      </td>
      <td>
        <span class="badge bg-secondary">${user.totalVisits}</span>
      </td>
      <td>
        <span class="badge bg-success">${user.grantedCount}</span>
      </td>
      <td>
        <span class="badge bg-danger">${user.deniedCount}</span>
      </td>
    `;

    return row;
  }

  // Обновление пользователей
  function refreshUsers() {
    loadUsers();
  }

  // Вспомогательные функции для управления UI
  function showLoading() {
    loadingIndicator.style.display = 'block';
  }

  function hideLoading() {
    loadingIndicator.style.display = 'none';
  }

  function showLoadingMore() {
    loadingMore.style.display = 'block';
  }

  function hideLoadingMore() {
    loadingMore.style.display = 'none';
  }

  function showNoMoreData() {
    noMoreData.style.display = 'block';
  }

  function hideNoMoreData() {
    noMoreData.style.display = 'none';
  }

  function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  function showTable() {
    tableContainer.style.display = 'block';
  }

  function hideTable() {
    tableContainer.style.display = 'none';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Экспорт в CSV
  function exportToCSV() {
    if (filteredUsers.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Подтверждение экспорта с количеством записей
    const count = filteredUsers.length;
    const countText = count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей';
    if (!confirm(`Экспортировать ${count} ${countText} в CSV?\n\nЭкспортируются только отфильтрованные данные.`)) {
      return;
    }

    // Заголовки CSV
    const headers = ['ФИО', 'Организация', 'Первый вход', 'Последний вход', 'Всего визитов', 'Разрешено', 'Запрещено'];
    const rows = [headers.join(',')];

    // Функция для экранирования CSV значений
    const escapeCSV = (text) => {
      if (text === null || text === undefined) return '';
      const str = String(text);
      // Если содержит кавычки, запятые или переносы строк - экранируем
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    // Форматирование даты для CSV
    const formatDateCSV = (date) => {
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Данные (используем filteredUsers - только отфильтрованные данные)
    filteredUsers.forEach(user => {
      const row = [
        escapeCSV(user.name || 'Неизвестно'),
        escapeCSV(user.organization_name || 'Не указана'),
        escapeCSV(formatDateCSV(user.firstAccess)),
        escapeCSV(formatDateCSV(user.lastAccess)),
        escapeCSV(user.totalVisits),
        escapeCSV(user.grantedCount),
        escapeCSV(user.deniedCount)
      ];
      rows.push(row.join(','));
    });

    // Создаем CSV содержимое
    const csvContent = rows.join('\n');
    
    // Создаем BOM для правильной кодировки в Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Формируем имя файла с датой
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `users_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Освобождаем память
    URL.revokeObjectURL(url);
  }

  // Функция debounce для задержки выполнения
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

})();

