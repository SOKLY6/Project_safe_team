(function() {
  'use strict';

  // API конфигурация
  const API_BASE_URL = window.location.origin.replace(':8001', ':8000') || 'http://localhost:8000';
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

  // WebSocket состояние
  let ws = null;
  let wsReconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 секунды
  let newEventsCount = 0;

  // Элементы WebSocket
  const newEventsIndicator = document.getElementById('new-events-indicator');
  const newEventsCountSpan = document.getElementById('new-events-count');

  // Инициализация
  document.addEventListener('DOMContentLoaded', function() {
    loadOrganizations();
    loadEvents();
    connectWebSocket();
    
    // Обработчики событий
    refreshBtn.addEventListener('click', refreshEvents);
    exportBtn.addEventListener('click', exportToCSV);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    searchNameInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Бесконечный скролл
    window.addEventListener('scroll', handleScroll);

    // Обработчик для индикатора новых событий (клик обновляет список)
    if (newEventsIndicator) {
      newEventsIndicator.addEventListener('click', function() {
        refreshEvents();
        resetNewEventsCount();
      });
    }
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
    resetNewEventsCount();
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

  // WebSocket подключение
  let pingInterval = null;
  
  function connectWebSocket() {
    // Формируем WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port === '8001' ? '8000' : window.location.port || '8000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/events`;

    console.log('Попытка подключения к WebSocket:', wsUrl);

    try {
      // Закрываем предыдущее соединение, если оно есть
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
      
      // Очищаем предыдущий интервал ping
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        console.log('✅ WebSocket подключен успешно:', wsUrl);
        console.log('✅ WebSocket readyState:', ws.readyState, '(1 = OPEN)');
        console.log('✅ WebSocket protocol:', ws.protocol);
        console.log('✅ WebSocket extensions:', ws.extensions);
        wsReconnectAttempts = 0;
        
        // Отправляем ping для поддержания соединения каждые 30 секунд
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('✅ Ping отправлен для поддержания соединения');
          } else {
            clearInterval(pingInterval);
            pingInterval = null;
          }
        }, 30000);
        
        // Отправляем первый ping сразу
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
          console.log('✅ Первый ping отправлен');
        }
      };

      ws.onmessage = function(event) {
        console.log('📨 Получено сообщение через WebSocket:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Парсинг успешен:', data);
          // Игнорируем ping/pong сообщения
          if (data.type === 'pong') {
            console.log('✅ Получен pong от сервера');
            return;
          }
          handleWebSocketEvent(data);
        } catch (e) {
          console.error('❌ Ошибка парсинга WebSocket сообщения:', e, event.data);
        }
      };

      ws.onerror = function(error) {
        console.error('❌ WebSocket ошибка:', error);
        console.error('❌ URL:', wsUrl);
        console.error('❌ readyState:', ws ? ws.readyState : 'undefined');
        console.error('❌ Проверьте, что сервер запущен на порту 8000 и поддерживает WebSocket');
      };

      ws.onclose = function(event) {
        console.log('⚠️ WebSocket отключен. Код:', event.code, 'Причина:', event.reason || 'не указана');
        console.log('⚠️ wasClean:', event.wasClean);
        
        // Очищаем интервал ping
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
        // Попытка переподключения (только если это не была нормальное закрытие)
        if (!event.wasClean && wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          wsReconnectAttempts++;
          console.log(`🔄 Попытка переподключения ${wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} через ${RECONNECT_DELAY}мс`);
          setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('❌ Достигнуто максимальное количество попыток переподключения');
          console.log('❌ Проверьте, что сервер запущен и доступен на', wsUrl);
        }
      };
    } catch (e) {
      console.error('Ошибка создания WebSocket подключения:', e);
    }
  }

  // Обработка события от WebSocket
  function handleWebSocketEvent(data) {
    console.log('Получено событие через WebSocket:', data);
    
    // Ожидаем, что данные содержат новое событие доступа
    // Формат: { type: 'access_log', id, timestamp, user_id, user_name, organization_id, organization_name, ... }
    if (data.type === 'access_log') {
      console.log('Новое событие доступа получено через WebSocket:', data);
      
      // Добавляем scanner_name для совместимости
      const newEvent = {
        ...data,
        scanner_name: data.scanner_id || 'Не указана',
        user_name: data.user_name || 'Неизвестно',
        organization_name: data.organization_name || 'Не указана'
      };
      
      // Добавляем новое событие наверх списка
      allEvents.unshift(newEvent);
      console.log('Событие добавлено в список. Всего событий:', allEvents.length);
      
      // Если событие соответствует текущим фильтрам, обновляем отображение
      const shouldShow = matchesFilters(newEvent);
      console.log('Событие соответствует фильтрам:', shouldShow);
      
      if (shouldShow) {
        // Обновляем отфильтрованные события
        applyFilters();
        newEventsCount++;
        updateNewEventsIndicator();
        console.log('Таблица обновлена. Новых событий:', newEventsCount);
      } else {
        // Событие не соответствует фильтрам, но все равно увеличиваем счетчик
        newEventsCount++;
        updateNewEventsIndicator();
        console.log('Событие не соответствует фильтрам, но счетчик обновлен. Новых событий:', newEventsCount);
      }
    } else {
      console.log('Получено событие неизвестного типа:', data.type);
    }
  }

  // Проверка, соответствует ли событие текущим фильтрам
  function matchesFilters(event) {
    // Проверка даты
    if (currentFilters.dateFrom) {
      const eventDate = new Date(event.timestamp);
      const fromDate = new Date(currentFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (eventDate < fromDate) return false;
    }

    if (currentFilters.dateTo) {
      const eventDate = new Date(event.timestamp);
      const toDate = new Date(currentFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (eventDate > toDate) return false;
    }

    // Проверка статуса
    if (currentFilters.status !== 'all') {
      const expectedStatus = currentFilters.status === 'granted';
      if (event.access_granted !== expectedStatus) return false;
    }

    // Проверка организации
    if (currentFilters.organization !== 'all') {
      const orgId = parseInt(currentFilters.organization);
      if (event.organization_id !== orgId) return false;
    }

    // Проверка поиска по ФИО
    if (currentFilters.searchName) {
      const searchTerm = currentFilters.searchName.toLowerCase();
      const userName = (event.user_name || '').toLowerCase();
      if (!userName.includes(searchTerm)) return false;
    }

    return true;
  }


  // Обновление индикатора новых событий
  function updateNewEventsIndicator() {
    if (!newEventsIndicator || !newEventsCountSpan) return;

    if (newEventsCount > 0) {
      newEventsCountSpan.textContent = newEventsCount;
      newEventsIndicator.style.display = 'inline-flex';
      newEventsIndicator.style.cursor = 'pointer';
      newEventsIndicator.title = 'Нажмите, чтобы обновить список';
    } else {
      newEventsIndicator.style.display = 'none';
    }
  }

  // Сброс счетчика новых событий
  function resetNewEventsCount() {
    newEventsCount = 0;
    updateNewEventsIndicator();
  }

})();

