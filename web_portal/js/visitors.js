(function() {
  'use strict';

  const API_BASE_URL = `http://${window.location.hostname}:8000`;
  const ITEMS_PER_PAGE = 50;
  const SCROLL_THRESHOLD = 200;

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
  const staffNavLink = document.getElementById('staff-nav-link');
  const apiNavLink = document.getElementById('api-nav-link');
  const actionsHeader = document.getElementById('actions-header');
  
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const organizationFilter = document.getElementById('organization-filter');
  const searchNameInput = document.getElementById('search-name');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const activeFiltersCount = document.getElementById('active-filters-count');
  const filtersCountSpan = document.getElementById('filters-count');

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


  document.addEventListener('DOMContentLoaded', function() {
    if (window.authUtils && window.authUtils.isAdmin()) {
      if (staffNavLink) staffNavLink.style.display = 'block';
      if (apiNavLink) apiNavLink.style.display = 'block';
      if (actionsHeader) actionsHeader.style.display = 'table-cell';
    }
    
    loadOrganizations();
    loadUsers();
    
    refreshBtn.addEventListener('click', loadUsers);
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
      loadMoreUsers();
    }
  }

  async function loadUsers() {
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
        console.error('Ошибка загрузки данных:', response.status, response.statusText);
        showError(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        hideLoading();
        return;
      }

      const accessLogs = await response.json();
      const usersMap = new Map();

      accessLogs.forEach(log => {
        if (!log.user_id || !log.user_name) return; 

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

        if (logDate < user.firstAccess) {
          user.firstAccess = logDate;
        }

        if (logDate > user.lastAccess) {
          user.lastAccess = logDate;
        }

        user.totalVisits++;
        if (log.access_granted) {
          user.grantedCount++;
        } else {
          user.deniedCount++;
        }
      });

      allUsers = Array.from(usersMap.values());

      allUsers.sort((a, b) => {
        return b.lastAccess.getTime() - a.lastAccess.getTime();
      });

      applyFilters();
      
      hideLoading();
      showTable();

    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
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

  function applyFilters() {
    currentFilters.dateFrom = dateFromInput.value || null;
    currentFilters.dateTo = dateToInput.value || null;
    currentFilters.organization = organizationFilter.value;
    currentFilters.searchName = searchNameInput.value.trim().toLowerCase();

    filteredUsers = allUsers.filter(user => {
      if (currentFilters.dateFrom) {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        if (lastAccessDate < currentFilters.dateFrom) {
          return false;
        }
      }

      if (currentFilters.dateTo) {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        if (lastAccessDate > currentFilters.dateTo) {
          return false;
        }
      }

      if (currentFilters.organization !== 'all') {
        const orgId = parseInt(currentFilters.organization);
        if (user.organization_id !== orgId) {
          return false;
        }
      }

      if (currentFilters.searchName) {
        const userName = (user.name || '').toLowerCase();
        if (!userName.includes(currentFilters.searchName)) {
          return false;
        }
      }

      return true;
    });

    filteredUsers.sort((a, b) => {
      return b.lastAccess.getTime() - a.lastAccess.getTime();
    });

    updateFiltersCount();

    currentPage = 0;
    hasMoreData = filteredUsers.length > 0;
    renderUsers();
  }

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

  function updateFiltersCount() {
    let count = 0;
    if (currentFilters.dateFrom) count++;
    if (currentFilters.dateTo) count++;
    if (currentFilters.organization !== 'all') count++;
    if (currentFilters.searchName) count++;

    filtersCountSpan.textContent = count;
    activeFiltersCount.style.display = count > 0 ? 'block' : 'none';
  }

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

  function renderUsersPage(users) {
    users.forEach(user => {
      const row = createUserRow(user);
      usersTbody.appendChild(row);
    });
  }

  function createUserRow(user) {
    const row = document.createElement('tr');
    
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

    const isAdmin = window.authUtils && window.authUtils.isAdmin();
    const actionsCell = isAdmin ? `
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id}, '${escapeHtml(user.name)}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    ` : '';

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
      ${actionsCell}
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
    if (filteredUsers.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const count = filteredUsers.length;
    const countText = count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей';
    if (!confirm(`Экспортировать ${count} ${countText} в CSV?\n\nЭкспортируются только отфильтрованные данные.`)) {
      return;
    }

    const headers = ['ФИО', 'Организация', 'Первый вход', 'Последний вход', 'Всего визитов', 'Разрешено', 'Запрещено'];
    const rows = [headers.join(',')];

    const escapeCSV = (text) => {
      if (text === null || text === undefined) return '';
      const str = String(text);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const formatDateCSV = (date) => {
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

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

    const csvContent = rows.join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `users_${dateStr}.csv`;
    
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

  window.deleteUser = async function(userId, userName) {
    if (!window.authUtils || !window.authUtils.isAdmin()) {
      alert('Доступ запрещен');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      const headers = window.authUtils.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (response.ok || response.status === 204) {
        alert('Пользователь успешно удален');
        loadUsers();
      } else {
        const data = await response.json().catch(() => ({}));
        alert('Ошибка при удалении пользователя: ' + (data.detail || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      alert('Ошибка сети при удалении пользователя');
    }
  };

})();
