(function() {
  'use strict';

  const API_BASE_URL = `http://${window.location.hostname}:8000`;

  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const tableContainer = document.getElementById('table-container');
  const staffTbody = document.getElementById('staff-tbody');
  const noData = document.getElementById('no-data');
  const refreshBtn = document.getElementById('refresh-btn');
  const addStaffBtn = document.getElementById('add-staff-btn');
  const saveStaffBtn = document.getElementById('save-staff-btn');
  const addStaffModal = new bootstrap.Modal(document.getElementById('addStaffModal'));

  document.addEventListener('DOMContentLoaded', function() {
    if (!window.authUtils || !window.authUtils.isAdmin()) {
      window.location.href = 'dashboard.html';
      return;
    }

    loadStaff();
    
    refreshBtn.addEventListener('click', loadStaff);
    addStaffBtn.addEventListener('click', () => addStaffModal.show());
    saveStaffBtn.addEventListener('click', saveStaff);
  });

  async function loadStaff() {
    showLoading();
    hideError();
    hideTable();

    try {
      const headers = window.authUtils.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/staff`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.authUtils.logout();
          return;
        }
        showError(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
        hideLoading();
        return;
      }

      const staffList = await response.json();
      renderStaff(staffList);
      
      hideLoading();
      showTable();

    } catch (error) {
      console.error('Ошибка загрузки охранников:', error);
      showError(`Ошибка подключения к серверу: ${error.message}`);
      hideLoading();
    }
  }

  function renderStaff(staffList) {
    staffTbody.innerHTML = '';
    
    const guardsOnly = staffList.filter(staff => staff.role === 'guard');
    
    noData.style.display = guardsOnly.length === 0 ? 'block' : 'none';
    
    if (guardsOnly.length === 0) {
      return;
    }

    guardsOnly.forEach(staff => {
      const row = createStaffRow(staff);
      staffTbody.appendChild(row);
    });
  }

  function createStaffRow(staff) {
    const row = document.createElement('tr');
    
    const currentUser = window.authUtils.getCurrentUsername();
    const isCurrentUser = staff.username === currentUser;
    const deleteBtn = isCurrentUser 
      ? '<button class="btn btn-sm btn-outline-danger" disabled title="Нельзя удалить себя"><i class="bi bi-trash"></i></button>'
      : `<button class="btn btn-sm btn-outline-danger" onclick="deleteStaff(${staff.id}, '${escapeHtml(staff.username)}')"><i class="bi bi-trash"></i></button>`;

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(staff.username)}</strong>
      </td>
      <td>
        <span class="badge bg-primary">Охранник</span>
      </td>
      <td>
        ${deleteBtn}
      </td>
    `;

    return row;
  }

  async function saveStaff() {
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value;

    if (!username || !password) {
      alert('Заполните все поля');
      return;
    }

    try {
      const headers = window.authUtils.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      if (response.ok) {
        addStaffModal.hide();
        document.getElementById('add-staff-form').reset();
        alert('Охранник успешно добавлен');
        loadStaff();
      } else {
        const data = await response.json().catch(() => ({}));
        alert('Ошибка при добавлении охранника: ' + (data.detail || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка при добавлении охранника:', error);
      alert('Ошибка сети при добавлении охранника');
    }
  }

  window.deleteStaff = async function(staffId, username) {
    if (!window.authUtils || !window.authUtils.isAdmin()) {
      alert('Доступ запрещен');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить охранника "${username}"? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      const headers = window.authUtils.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/staff/${staffId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (response.ok || response.status === 204) {
        alert('Охранник успешно удален');
        loadStaff();
      } else {
        const data = await response.json().catch(() => ({}));
        alert('Ошибка при удалении охранника: ' + (data.detail || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка при удалении охранника:', error);
      alert('Ошибка сети при удалении охранника');
    }
  };

  function showLoading() {
    loadingIndicator.style.display = 'block';
  }

  function hideLoading() {
    loadingIndicator.style.display = 'none';
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

})();
