import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 200;

const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const Visitors = () => {
  const { isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    organization: 'all',
    searchName: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    organization: 'all',
    searchName: ''
  });

  useEffect(() => {
    loadOrganizations();
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appliedFilters, allUsers]);

  useEffect(() => {
    renderUsers();
  }, [filteredUsers]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMoreData) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;

      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        loadMoreUsers();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMoreData, filteredUsers, currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/access-logs/', {
        params: { limit: 500 }
      });
      
      const accessLogs = response.data || [];
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

      const users = Array.from(usersMap.values());
      users.sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime());
      setAllUsers(users);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки посетителей');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/organizations/');
      setOrganizations(response.data || []);
    } catch (err) {
    }
  };

  const applyFilters = () => {
    let filtered = [...allUsers];

    if (appliedFilters.dateFrom) {
      filtered = filtered.filter(user => {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        return lastAccessDate >= appliedFilters.dateFrom;
      });
    }

    if (appliedFilters.dateTo) {
      filtered = filtered.filter(user => {
        const lastAccessDate = user.lastAccess.toISOString().split('T')[0];
        return lastAccessDate <= appliedFilters.dateTo;
      });
    }

    if (appliedFilters.organization !== 'all') {
      const orgId = parseInt(appliedFilters.organization);
      filtered = filtered.filter(user => user.organization_id === orgId);
    }

    if (appliedFilters.searchName) {
      const searchLower = appliedFilters.searchName.toLowerCase();
      filtered = filtered.filter(user => 
        (user.name || '').toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime());
    setFilteredUsers(filtered);
    setCurrentPage(0);
    setHasMoreData(filtered.length > ITEMS_PER_PAGE);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const debouncedApplySearch = useRef(
    debounce((searchValue) => {
      setAppliedFilters(prev => ({ ...prev, searchName: searchValue }));
    }, 300)
  ).current;

  const handleSearchNameChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, searchName: value }));
    debouncedApplySearch(value);
  };

  const renderUsers = () => {
    const firstPage = filteredUsers.slice(0, ITEMS_PER_PAGE);
    setDisplayedUsers(firstPage);
    setCurrentPage(0);
    setHasMoreData(filteredUsers.length > ITEMS_PER_PAGE);
  };

  const loadMoreUsers = async () => {
    if (loadingMore || !hasMoreData) return;

    const nextPage = currentPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    if (startIndex >= filteredUsers.length) {
      setHasMoreData(false);
      return;
    }

    setLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    setDisplayedUsers(prev => [...prev, ...pageUsers]);
    setCurrentPage(nextPage);
    setHasMoreData(endIndex < filteredUsers.length);
    setLoadingMore(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateFrom: '',
      dateTo: '',
      organization: 'all',
      searchName: ''
    };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (appliedFilters.dateFrom) count++;
    if (appliedFilters.dateTo) count++;
    if (appliedFilters.organization !== 'all') count++;
    if (appliedFilters.searchName) count++;
    return count;
  };


  const exportToCSV = () => {
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
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!isAdmin) {
      alert('Доступ запрещен');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      alert('Пользователь успешно удален');
      loadUsers();
    } catch (err) {
      const errorData = err.response?.data || {};
      alert('Ошибка при удалении пользователя: ' + (errorData.detail || 'Неизвестная ошибка'));
    }
  };

  const formatDate = (date) => {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      <Navbar />
      <main className="container py-4">
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex align-items-center gap-3">
                    <h1 className="h4 mb-0">
                      <i className="bi bi-person-lines-fill me-2"></i>Пользователи
                    </h1>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-success btn-sm" onClick={exportToCSV}>
                      <i className="bi bi-download me-1"></i>Экспорт CSV
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={loadUsers}>
                      <i className="bi bi-arrow-clockwise me-1"></i>Обновить
                    </button>
                  </div>
                </div>

                <div className="card border-0 bg-light mb-4">
                  <div className="card-body p-3">
                    <div className="row g-3">
                      <div className="col-12 col-md-3">
                        <label htmlFor="date-from" className="form-label small fw-semibold">Дата от</label>
                        <input
                          type="date"
                          id="date-from"
                          className="form-control form-control-sm"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label htmlFor="date-to" className="form-label small fw-semibold">Дата до</label>
                        <input
                          type="date"
                          id="date-to"
                          className="form-control form-control-sm"
                          value={filters.dateTo}
                          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label htmlFor="organization-filter" className="form-label small fw-semibold">Организация</label>
                        <select
                          id="organization-filter"
                          className="form-select form-select-sm"
                          value={filters.organization}
                          onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                        >
                          <option value="all">Все</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label htmlFor="search-name" className="form-label small fw-semibold">Поиск по ФИО</label>
                        <input
                          type="text"
                          id="search-name"
                          className="form-control form-control-sm"
                          placeholder="Введите ФИО..."
                          value={filters.searchName}
                          onChange={handleSearchNameChange}
                        />
                      </div>
                    </div>
                    <div className="row mt-3">
                      <div className="col-12">
                        <div className="d-flex gap-2">
                          <button className="btn btn-primary btn-sm" onClick={handleApplyFilters}>
                            <i className="bi bi-funnel me-1"></i>Применить фильтры
                          </button>
                          <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                            <i className="bi bi-x-circle me-1"></i>Очистить
                          </button>
                          {activeFiltersCount > 0 && (
                            <div className="ms-auto align-self-center small text-muted">
                              Активных фильтров: <span>{activeFiltersCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Загрузка...</span>
                    </div>
                    <p className="mt-2 text-muted small">Загрузка пользователей...</p>
                  </div>
                ) : error ? (
                  <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th scope="col" style={{ width: '200px' }}>
                              <div className="d-flex align-items-center">
                                <span>ФИО</span>
                                <i className="bi bi-arrow-down-up ms-2 text-muted" style={{ fontSize: '0.875rem' }}></i>
                              </div>
                            </th>
                            <th scope="col" style={{ width: '200px' }}>Организация</th>
                            <th scope="col" style={{ width: '180px' }}>Первый вход</th>
                            <th scope="col" style={{ width: '180px' }}>Последний вход</th>
                            <th scope="col" style={{ width: '120px' }}>Всего визитов</th>
                            <th scope="col" style={{ width: '120px' }}>Разрешено</th>
                            <th scope="col" style={{ width: '120px' }}>Запрещено</th>
                            {isAdmin && (
                              <th scope="col" style={{ width: '100px' }}>Действия</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {displayedUsers.length === 0 ? (
                            <tr>
                              <td colSpan={isAdmin ? 8 : 7} className="text-center text-muted py-5">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">Пользователи не найдены</p>
                              </td>
                            </tr>
                          ) : (
                            displayedUsers.map((user) => (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.name}</strong>
                                </td>
                                <td>{user.organization_name}</td>
                                <td>
                                  <small className="text-muted">{formatDate(user.firstAccess)}</small>
                                </td>
                                <td>
                                  <small className="text-muted">{formatDate(user.lastAccess)}</small>
                                </td>
                                <td>
                                  <span className="badge bg-secondary">{user.totalVisits}</span>
                                </td>
                                <td>
                                  <span className="badge bg-success">{user.grantedCount}</span>
                                </td>
                                <td>
                                  <span className="badge bg-danger">{user.deniedCount}</span>
                                </td>
                                {isAdmin && (
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {loadingMore && (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Загрузка...</span>
                        </div>
                      </div>
                    )}

                    {!hasMoreData && displayedUsers.length > 0 && (
                      <div className="text-center text-muted py-3">
                        <small>Все пользователи загружены</small>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Visitors;
