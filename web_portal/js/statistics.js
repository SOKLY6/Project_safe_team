(function() {
  'use strict';

  // API конфигурация
  // Используем hostname из текущего URL, чтобы работать на других устройствах
  // Если сайт открыт по IP (например, http://192.168.1.100:8001), то API будет на том же IP
  const getApiBaseUrl = () => {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const port = window.location.port === '8001' ? '8000' : (window.location.port || '8000');
    const protocol = window.location.protocol;
    
    // Если hostname - localhost, оставляем как есть (для локальной разработки)
    // Если hostname - IP-адрес, используем его (для работы на других устройствах)
    return `${protocol}//${hostname}:${port}`;
  };
  const API_BASE_URL = getApiBaseUrl();
  const ITEMS_PER_PAGE = 50;
  const SCROLL_THRESHOLD = 200; // Загружать следующую страницу за 200px до конца

  // Элементы DOM
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const tableContainer = document.getElementById('table-container');
  const eventsTbody = document.getElementById('events-tbody');
  const loadingMore = document.getElementById('loading-more');
  const noMoreData = document.getElementById('no-more-data');
  const noData = document.getElementById('no-data');
  const refreshBtn = document.getElementById('refresh-btn');
  const exportBtn = document.getElementById('export-btn');
  
  // Элементы фильтров
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const statusFilter = document.getElementById('status-filter');
  const organizationFilter = document.getElementById('organization-filter');
  const searchNameInput = document.getElementById('search-name');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const activeFiltersCount = document.getElementById('active-filters-count');
  const filtersCountSpan = document.getElementById('filters-count');

  // Состояние
  let allEvents = [];
  let filteredEvents = [];
  let organizations = [];
  let currentPage = 0;
  let isLoading = false;
  let hasMoreData = true;
  let currentFilters = {
    dateFrom: null,
    dateTo: null,
    status: 'all',
    organization: 'all',
    searchName: ''
  };


  // Инициализация
  document.addEventListener('DOMContentLoaded', function() {
    loadOrganizations();
    loadEvents();
    
    // Обработчики событий
    refreshBtn.addEventListener('click', refreshEvents);
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
      loadMoreEvents();
    }
  }

  // Загрузка всех событий
  async function loadEvents() {
    showLoading();
    hideError();
    hideTable();

    try {
      // Получаем все access logs из API
      // Загружаем больше данных (лимит 500 - максимум)
      const response = await fetch(`${API_BASE_URL}/access-logs/?limit=500`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        // Если API недоступен, показываем ошибку
        console.error('Ошибка загрузки событий:', response.status, response.statusText);
        showError(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        hideLoading();
        return;
      }

      const data = await response.json();
      
      // API уже возвращает данные с user_name и organization_name
      // Добавляем scanner_name для совместимости
      allEvents = data.map(event => ({
        ...event,
        scanner_name: event.scanner_id || 'Не указана',
        user_name: event.user_name || 'Неизвестно',
        organization_name: event.organization_name || 'Не указана'
      }));
      
      // Сортируем по времени (новые сверху)
      allEvents = allEvents.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Новые сверху
      });

      // Применяем текущие фильтры
      applyFilters();
      
      hideLoading();
      showTable();

    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
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


  // Загрузка дополнительных событий (для бесконечного скролла)
  async function loadMoreEvents() {
    if (isLoading || !hasMoreData) return;

    const nextPage = currentPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    if (startIndex >= filteredEvents.length) {
      hasMoreData = false;
      showNoMoreData();
      return;
    }

    isLoading = true;
    showLoadingMore();

    // Имитация задержки для плавности
    await new Promise(resolve => setTimeout(resolve, 300));

    const pageEvents = filteredEvents.slice(startIndex, endIndex);
    renderEventsPage(pageEvents);
    
    currentPage = nextPage;
    hasMoreData = endIndex < filteredEvents.length;

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
    currentFilters.status = statusFilter.value;
    currentFilters.organization = organizationFilter.value;
    currentFilters.searchName = searchNameInput.value.trim().toLowerCase();

    // Фильтруем события
    filteredEvents = allEvents.filter(event => {
      // Фильтр по дате от
      if (currentFilters.dateFrom) {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        if (eventDate < currentFilters.dateFrom) {
          return false;
        }
      }

      // Фильтр по дате до
      if (currentFilters.dateTo) {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        if (eventDate > currentFilters.dateTo) {
          return false;
        }
      }

      // Фильтр по статусу
      if (currentFilters.status !== 'all') {
        const isGranted = currentFilters.status === 'granted';
        if (event.access_granted !== isGranted) {
          return false;
        }
      }

      // Фильтр по организации
      if (currentFilters.organization !== 'all') {
        const orgId = parseInt(currentFilters.organization);
        if (event.organization_id !== orgId) {
          return false;
        }
      }

      // Поиск по ФИО
      if (currentFilters.searchName) {
        const userName = (event.user_name || '').toLowerCase();
        if (!userName.includes(currentFilters.searchName)) {
          return false;
        }
      }

      return true;
    });

    // Сортируем отфильтрованные события по времени (новые сверху)
    filteredEvents = filteredEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Новые сверху
    });

    // Обновляем счетчик активных фильтров
    updateFiltersCount();

    // Перерисовываем таблицу
    currentPage = 0;
    hasMoreData = filteredEvents.length > 0;
    renderEvents();
  }

  // Очистка фильтров
  function clearFilters() {
    dateFromInput.value = '';
    dateToInput.value = '';
    statusFilter.value = 'all';
    organizationFilter.value = 'all';
    searchNameInput.value = '';
    
    currentFilters = {
      dateFrom: null,
      dateTo: null,
      status: 'all',
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
    if (currentFilters.status !== 'all') count++;
    if (currentFilters.organization !== 'all') count++;
    if (currentFilters.searchName) count++;

    filtersCountSpan.textContent = count;
    activeFiltersCount.style.display = count > 0 ? 'block' : 'none';
  }

  // Отображение всех событий (первая страница)
  function renderEvents() {
    eventsTbody.innerHTML = '';
    noData.style.display = filteredEvents.length === 0 ? 'block' : 'none';
    
    if (filteredEvents.length === 0) {
      hasMoreData = false;
      return;
    }

    const firstPageEvents = filteredEvents.slice(0, ITEMS_PER_PAGE);
    renderEventsPage(firstPageEvents);
    
    currentPage = 0;
    hasMoreData = filteredEvents.length > ITEMS_PER_PAGE;
    
    if (!hasMoreData) {
      showNoMoreData();
    }
  }

  // Отображение страницы событий
  function renderEventsPage(events) {
    events.forEach(event => {
      const row = createEventRow(event);
      eventsTbody.appendChild(row);
    });
  }

  // Создание строки таблицы для события
  function createEventRow(event) {
    const row = document.createElement('tr');
    
    // Форматирование времени
    const date = new Date(event.timestamp);
    const formattedTime = date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Статус доступа
    const statusClass = event.access_granted ? 'success' : 'danger';
    const statusIcon = event.access_granted ? 'check-circle-fill' : 'x-circle-fill';
    const statusText = event.access_granted ? 'Разрешён' : 'Запрещён';

    row.innerHTML = `
      <td>
        <small class="text-muted">${formattedTime}</small>
      </td>
      <td>
        <strong>${escapeHtml(event.user_name)}</strong>
      </td>
      <td>${escapeHtml(event.organization_name)}</td>
      <td>
        <span class="badge bg-${statusClass}">
          <i class="bi bi-${statusIcon} me-1"></i>${statusText}
        </span>
      </td>
      <td>
        <small class="text-muted">${escapeHtml(event.scanner_name)}</small>
      </td>
    `;

    return row;
  }

  // Обновление событий
  function refreshEvents() {
    loadEvents();
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
    if (filteredEvents.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    // Подтверждение экспорта с количеством записей
    const count = filteredEvents.length;
    const countText = count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей';
    if (!confirm(`Экспортировать ${count} ${countText} в CSV?\n\nЭкспортируются только отфильтрованные данные.`)) {
      return;
    }

    // Заголовки CSV
    const headers = ['Время', 'ФИО', 'Организация', 'Статус', 'Точка доступа'];
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

    // Данные (используем filteredEvents - только отфильтрованные данные)
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const formattedTime = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const status = event.access_granted ? 'Разрешён' : 'Отказано';
      
      const row = [
        escapeCSV(formattedTime),
        escapeCSV(event.user_name || 'Неизвестно'),
        escapeCSV(event.organization_name || 'Не указана'),
        escapeCSV(status),
        escapeCSV(event.scanner_name || 'Не указана')
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
    const filename = `statistics_${dateStr}.csv`;
    
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

