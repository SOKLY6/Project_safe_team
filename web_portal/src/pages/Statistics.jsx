import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const ITEMS_PER_PAGE = 50;
const SCROLL_THRESHOLD = 200;

const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const Statistics = () => {
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [displayedEvents, setDisplayedEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    organization: 'all',
    searchName: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    organization: 'all',
    searchName: ''
  });

  useEffect(() => {
    loadOrganizations();
    loadEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appliedFilters, allEvents]);

  useEffect(() => {
    renderEvents();
  }, [filteredEvents]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMoreData) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;

      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        loadMoreEvents();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMoreData, filteredEvents, currentPage]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/access-logs/', {
        params: { limit: 500 }
      });
      
      const events = (response.data || []).map(event => ({
        ...event,
        scanner_name: event.scanner_id || 'Не указана',
        user_name: event.user_name || 'Неизвестно',
        organization_name: event.organization_name || 'Не указана'
      }));
      
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAllEvents(events);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/organizations/');
      setOrganizations(response.data || []);
    } catch (err) {
      // Игнорируем ошибку
    }
  };

  const applyFilters = () => {
    let filtered = [...allEvents];

    if (appliedFilters.dateFrom) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        return eventDate >= appliedFilters.dateFrom;
      });
    }

    if (appliedFilters.dateTo) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
        return eventDate <= appliedFilters.dateTo;
      });
    }

    if (appliedFilters.status !== 'all') {
      const isGranted = appliedFilters.status === 'granted';
      filtered = filtered.filter(event => event.access_granted === isGranted);
    }

    if (appliedFilters.organization !== 'all') {
      const orgId = parseInt(appliedFilters.organization);
      filtered = filtered.filter(event => event.organization_id === orgId);
    }

    if (appliedFilters.searchName) {
      const searchLower = appliedFilters.searchName.toLowerCase();
      filtered = filtered.filter(event => 
        (event.user_name || '').toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setFilteredEvents(filtered);
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

  const renderEvents = () => {
    const firstPage = filteredEvents.slice(0, ITEMS_PER_PAGE);
    setDisplayedEvents(firstPage);
    setCurrentPage(0);
    setHasMoreData(filteredEvents.length > ITEMS_PER_PAGE);
  };

  const loadMoreEvents = async () => {
    if (loadingMore || !hasMoreData) return;

    const nextPage = currentPage + 1;
    const startIndex = nextPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    if (startIndex >= filteredEvents.length) {
      setHasMoreData(false);
      return;
    }

    setLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const pageEvents = filteredEvents.slice(startIndex, endIndex);
    setDisplayedEvents(prev => [...prev, ...pageEvents]);
    setCurrentPage(nextPage);
    setHasMoreData(endIndex < filteredEvents.length);
    setLoadingMore(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateFrom: '',
      dateTo: '',
      status: 'all',
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
    if (appliedFilters.status !== 'all') count++;
    if (appliedFilters.organization !== 'all') count++;
    if (appliedFilters.searchName) count++;
    return count;
  };

  const exportToCSV = () => {
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
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
                      <i className="bi bi-bar-chart-fill me-2"></i>Статистика событий доступа
                    </h1>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-success btn-sm" onClick={exportToCSV}>
                      <i className="bi bi-download me-1"></i>Экспорт CSV
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={loadEvents}>
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
                      <div className="col-12 col-md-2">
                        <label htmlFor="status-filter" className="form-label small fw-semibold">Статус</label>
                        <select
                          id="status-filter"
                          className="form-select form-select-sm"
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                          <option value="all">Все</option>
                          <option value="granted">Разрешён</option>
                          <option value="denied">Запрещён</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-2">
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
                      <div className="col-12 col-md-2">
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
                    <p className="mt-2 text-muted small">Загрузка событий...</p>
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
                            <th scope="col" style={{ width: '180px' }}>
                              <div className="d-flex align-items-center">
                                <span>Время</span>
                                <i className="bi bi-arrow-down-up ms-2 text-muted" style={{ fontSize: '0.875rem' }}></i>
                              </div>
                            </th>
                            <th scope="col" style={{ width: '200px' }}>ФИО</th>
                            <th scope="col" style={{ width: '200px' }}>Организация</th>
                            <th scope="col" style={{ width: '120px' }}>Статус</th>
                            <th scope="col">Точка доступа</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedEvents.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center text-muted py-5">
                                <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">События не найдены</p>
                              </td>
                            </tr>
                          ) : (
                            displayedEvents.map((event) => {
                              const statusClass = event.access_granted ? 'success' : 'danger';
                              const statusIcon = event.access_granted ? 'check-circle-fill' : 'x-circle-fill';
                              const statusText = event.access_granted ? 'Разрешён' : 'Запрещён';

                              return (
                                <tr key={event.id}>
                                  <td>
                                    <small className="text-muted">{formatTime(event.timestamp)}</small>
                                  </td>
                                  <td>
                                    <strong>{event.user_name}</strong>
                                  </td>
                                  <td>{event.organization_name}</td>
                                  <td>
                                    <span className={`badge bg-${statusClass}`}>
                                      <i className={`bi bi-${statusIcon} me-1`}></i>{statusText}
                                    </span>
                                  </td>
                                  <td>
                                    <small className="text-muted">{event.scanner_name}</small>
                                  </td>
                                </tr>
                              );
                            })
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

                    {!hasMoreData && displayedEvents.length > 0 && (
                      <div className="text-center text-muted py-3">
                        <small>Все события загружены</small>
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

export default Statistics;
