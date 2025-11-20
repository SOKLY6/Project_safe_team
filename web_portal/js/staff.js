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

document.addEventListener('DOMContentLoaded', () => {
  if (!window.authUtils?.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const apiNavLink = document.getElementById('api-nav-link');
  if (apiNavLink) apiNavLink.style.display = 'block';

  loadStaff();

  refreshBtn.addEventListener('click', loadStaff);
  addStaffBtn.addEventListener('click', () => addStaffModal.show());
  saveStaffBtn.addEventListener('click', saveStaff);
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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

async function loadStaff() {
  showLoading();
  hideError();
  hideTable();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/staff`, {
      method: 'GET',
      headers: window.authUtils.getAuthHeaders()
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.authUtils.logout();
        return;
      }

      showError(`Ошибка загрузки данных: ${res.status} ${res.statusText}`);
      hideLoading();
      return;
    }

    const staffList = await res.json();
    renderStaff(staffList);
    hideLoading();
    showTable();

  } catch (err) {
    console.error('Ошибка загрузки охранников:', err);
    showError(`Ошибка подключения к серверу: ${err.message}`);
    hideLoading();
  }
}

function renderStaff(staffList) {
  staffTbody.innerHTML = '';
  
  const guards = staffList.filter(s => s.role === 'guard');
  noData.style.display = guards.length === 0 ? 'block' : 'none';
  
  guards.forEach(staff => {
    staffTbody.appendChild(createStaffRow(staff));
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
    <td><strong>${escapeHtml(staff.username)}</strong></td>
    <td><span class="badge bg-primary">Охранник</span></td>
    <td>${deleteBtn}</td>
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
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: window.authUtils.getAuthHeaders(),
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      addStaffModal.hide();
      document.getElementById('add-staff-form').reset();
      alert('Охранник успешно добавлен');
      loadStaff();
    } else {
      const data = await res.json().catch(() => ({}));
      alert('Ошибка при добавлении охранника: ' + (data.detail || 'Неизвестная ошибка'));
    }
  } catch (err) {
    console.error('Ошибка при добавлении охранника:', err);
    alert('Ошибка сети при добавлении охранника');
  }
}

window.deleteStaff = async (staffId, username) => {
  if (!window.authUtils?.isAdmin()) {
    alert('Доступ запрещен');
    return;
  }

  if (!confirm(`Вы уверены, что хотите удалить охранника "${username}"? Это действие нельзя отменить!`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/staff/${staffId}`, {
      method: 'DELETE',
      headers: window.authUtils.getAuthHeaders()
    });

    if (res.ok || res.status === 204) {
      alert('Охранник успешно удален');
      loadStaff();
    } else {
      const data = await res.json().catch(() => ({}));
      alert('Ошибка при удалении охранника: ' + (data.detail || 'Неизвестная ошибка'));
    }
  } catch (err) {
    console.error('Ошибка при удалении охранника:', err);
    alert('Ошибка сети при удалении охранника');
  }
};
