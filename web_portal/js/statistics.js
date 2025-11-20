(function() {
  'use strict';

  const API_BASE_URL = `http://${window.location.hostname}:8000`;
  const ITEMS_PER_PAGE = 50;
  const SCROLL_THRESHOLD = 200;

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
  const staffNavLink = document.getElementById('staff-nav-link');
  const apiNavLink = document.getElementById('api-nav-link');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const statusFilter = document.getElementById('status-filter');
  const organizationFilter = document.getElementById('organization-filter');
  const searchNameInput = document.getElementById('search-name');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const activeFiltersCount = document.getElementById('active-filters-count');
  const filtersCountSpan = document.getElementById('filters-count');

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


  document.addEventListener('DOMContentLoaded', function() {
    if (window.authUtils && window.authUtils.isAdmin()) {
      if (staffNavLink) staffNavLink.style.display = 'block';
      if (apiNavLink) apiNavLink.style.display = 'block';
    }
    
    loadOrganizations();
    loadEvents();
    
    refreshBtn.addEventListener('click', loadEvents);
    exportBtn.addEventListener('click', exportToCSV);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);
    searchNameInput.addEventListener('input', debounce(applyFilters, 300));
    
    window.addEventListener('scroll', handleScroll);
  });

  function handleScroll() {
    if (isLoading || !hasMoreData) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      loadMoreEvents();
    }
  }

  async function loadEvents() {
    showLoading();
    hideError();
    hideTable();

    try {
      const response = await fetch(`${API_BASE_URL}/access-logs/?limit=500`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Ошибка загрузки событий:', response.status, response.statusText);
        showError(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        hideLoading();
        return;
      }

      const data = await response.json();
      
      allEvents = data.map(event => {
        return {
          ...event,
          scanner_name: event.scanner_id || 'Не указана',
          user_name: event.user_name || 'Неизвестно',
          organization_name: event.organization_name || 'Не указана'
        };
      });
      
      allEvents.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      applyFilters();
      
      hideLoading();
      showTable();

    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
      showError(`Ошибка подключения к серверу: ${error.message}`);
      hideLoading();
    }
  }


  async function loadOrganizations() {
    try {
      const orgsResponse = await fetch(`${API_BASE_URL}/organizations/`);
      if (!orgsResponse.ok) {
        console.error('Ошибка загрузки организаций:', orgsResponse.status, orgsResponse.statusText);
        return;
      }
      
      organizations = await orgsResponse.json();
      
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

  function applyFilters() {
    currentFilters.dateFrom = dateFromInput.value || null;
    currentFilters.dateTo = dateToInput.value || null;
    currentFilters.status = statusFilter.value;
    currentFilters.organization = organizationFilter.value;
    currentFilters.searchName = searchNameInput.value.trim().toLowerCase();

    filteredEvents = allEvents.filter(event => {
      if (currentFilters.dateFrom) {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        if (eventDate < currentFilters.dateFrom) {
          return false;
        }
      }

      if (currentFilters.dateTo) {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        if (eventDate > currentFilters.dateTo) {
          return false;
        }
      }

      if (currentFilters.status !== 'all') {
        const isGranted = currentFilters.status === 'granted';
        if (event.access_granted !== isGranted) {
          return false;
        }
      }

      if (currentFilters.organization !== 'all') {
        const orgId = parseInt(currentFilters.organization);
        if (event.organization_id !== orgId) {
          return false;
        }
      }

      if (currentFilters.searchName) {
        const userName = (event.user_name || '').toLowerCase();
        if (!userName.includes(currentFilters.searchName)) {
          return false;
        }
      }

      return true;
    });

    filteredEvents.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    updateFiltersCount();

    currentPage = 0;
    hasMoreData = filteredEvents.length > 0;
    renderEvents();
  }

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

  function renderEventsPage(events) {
    events.forEach(event => {
      const row = createEventRow(event);
      eventsTbody.appendChild(row);
    });
  }

  function createEventRow(event) {
    const row = document.createElement('tr');
    
    const date = new Date(event.timestamp);
    const formattedTime = date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

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

  function showLoading() {
    loadingIndicator.style.display = 'block';
  }

  function hideLoading() {
    loadingIndicator.style.display = 'none';
  }

  function showLoadingMore() {
    if (loadingMore) loadingMore.style.display = 'block';
  }

  function hideLoadingMore() {
    if (loadingMore) loadingMore.style.display = 'none';
  }

  function showNoMoreData() {
    if (noMoreData) noMoreData.style.display = 'block';
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

  function exportToCSV() {
    if (filteredEvents.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const count = filteredEvents.length;
    const countText = count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей';
    if (!confirm(`Экспортировать ${count} ${countText} в CSV?\n\nЭкспортируются только отфильтрованные данные.`)) {
      return;
    }

    const headers = ['Время', 'ФИО', 'Организация', 'Статус', 'Точка доступа'];
    const rows = [headers.join(',')];

    const escapeCSV = (text) => {
      if (text === null || text === undefined) return '';
      const str = String(text);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

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

    const csvContent = rows.join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `statistics_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

})();
