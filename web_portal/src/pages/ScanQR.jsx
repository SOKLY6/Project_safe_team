import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const HISTORY_KEY = 'qr_scan_history';
const MAX_HISTORY_ITEMS = 10;

const ScanQR = () => {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const qrInputRef = useRef(null);

  useEffect(() => {
    loadHistory();
    loadOrganizations();
    if (qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isHistoryExpanded) {
      renderHistory();
    }
  }, [isHistoryExpanded, historySearch, history]);

  const loadOrganizations = async () => {
    try {
      const response = await api.get('/organizations/');
      setOrganizations(response.data || []);
    } catch (err) {
      // Игнорируем ошибку
    }
  };

  const getHistory = () => {
    try {
      const historyJson = localStorage.getItem(HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (e) {
      return [];
    }
  };

  const saveHistory = (newHistory) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error('Ошибка сохранения истории:', e);
    }
  };

  const loadHistory = () => {
    setHistory(getHistory());
  };

  const saveToHistory = (qrCode, success, message, data, user) => {
    const currentHistory = getHistory();
    const filteredHistory = currentHistory.filter(item => item.qrCode !== qrCode);
    
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
  };

  const validateQRCode = () => {
    const qrValue = qrInput.trim();
    
    if (!qrValue) {
      setError('Введите QR-код для проверки');
      return false;
    }

    if (qrValue.length < 5) {
      setError('QR-код слишком короткий (минимум 5 символов)');
      return false;
    }

    setError('');
    return true;
  };

  const checkQRCode = async (qrCode) => {
    const normalizedQR = qrCode.trim();
    
    try {
      const response = await api.post('/qr/verify', {
        qr_data: normalizedQR,
        scanner_id: 'web_portal'
      });

      const data = response.data;

      if (data.status === 'granted' && data.user_info) {
        const userInfo = data.user_info;
        
        let organizationName = 'Не указана';
        if (userInfo.organization_id) {
          const org = organizations.find(o => o.id === userInfo.organization_id);
          if (org) {
            organizationName = org.name;
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
    } catch (err) {
      const errorData = err.response?.data || {};
      let errorMessage = 'Ошибка сети. Проверьте подключение к серверу.';
      
      if (errorData.message) {
        const message = errorData.message.toLowerCase();
        if (message.includes('expired')) {
          errorMessage = 'QR-код истёк.';
        } else if (message.includes('access denied') || message.includes('доступ запрещён')) {
          errorMessage = 'Доступ запрещён';
        } else {
          errorMessage = errorData.message;
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateQRCode()) {
      return;
    }

    const qrCode = qrInput.trim();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const [result] = await Promise.all([
        checkQRCode(qrCode),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      
      let displayMessage = result.message || 'QR-код действителен. Доступ разрешён.';
      displayMessage = displayMessage.replace(/(Доступ разрешён\.?\s*){2,}/gi, 'Доступ разрешён.');
      displayMessage = displayMessage.trim();
      
      setResult({
        success: result.success,
        message: displayMessage,
        data: result.data
      });

      const user = result.data?.user;
      saveToHistory(qrCode, result.success, displayMessage, result.data, user);
    } catch (err) {
      setResult({
        success: false,
        message: 'Ошибка проверки QR-кода'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (loading) return; // Не выполняем очистку во время загрузки
    setQrInput('');
    setResult(null);
    setError('');
    if (qrInputRef.current) {
      qrInputRef.current.focus();
    }
  };

  const formatTime = (timestamp) => {
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
  };

  const truncateText = (text, maxLength = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const filterHistory = (historyList, searchQuery) => {
    if (!searchQuery.trim()) return historyList;
    
    const query = searchQuery.toLowerCase().trim();
    return historyList.filter(item => {
      const qrLower = item.qrCode.toLowerCase();
      const messageLower = item.message.toLowerCase();
      return qrLower.includes(query) || messageLower.includes(query);
    });
  };

  const renderHistory = () => {
    // История рендерится через JSX ниже
  };

  const useFromHistory = (qrCode) => {
    setQrInput(qrCode);
    setError('');
    setResult(null);
    setTimeout(() => {
      if (qrInputRef.current) {
        qrInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        qrInputRef.current.focus();
      }
    }, 100);
  };

  const deleteHistoryItem = (qrCode) => {
    if (!window.confirm('Удалить этот элемент из истории?')) {
      return;
    }
    
    const currentHistory = getHistory();
    const filteredHistory = currentHistory.filter(item => item.qrCode !== qrCode);
    saveHistory(filteredHistory);
  };

  const clearAllHistory = () => {
    const currentHistory = getHistory();
    if (currentHistory.length === 0) {
      return;
    }
    
    if (!window.confirm(`Удалить всю историю проверок (${currentHistory.length} элементов)?`)) {
      return;
    }
    
    saveHistory([]);
  };

  const toggleHistory = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  const filteredHistory = filterHistory(history, historySearch);

  const formatTimestamp = (timestamp) => {
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

  return (
    <>
      <Navbar />
      <main className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                    <i className="bi bi-qr-code-scan" style={{ fontSize: '24px' }}></i>
                  </div>
                  <h1 className="h4 mb-2">Проверка QR-кода</h1>
                  <p className="text-muted">Введите или вставьте QR-код для проверки доступа</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="qr-input" className="form-label fw-semibold">QR-код</label>
                    <textarea
                      ref={qrInputRef}
                      id="qr-input"
                      name="qr_code"
                      className={`form-control ${error ? 'is-invalid' : ''}`}
                      rows="8"
                      placeholder="Вставьте QR-код здесь или введите вручную..."
                      autoComplete="off"
                      spellCheck="false"
                      style={{ fontFamily: "'Courier New', monospace", fontSize: '14px', resize: 'vertical', minHeight: '200px' }}
                      value={qrInput}
                      onChange={(e) => {
                        setQrInput(e.target.value);
                        setError('');
                        if (result) setResult(null);
                      }}
                      disabled={loading}
                    />
                    {error && (
                      <div className="invalid-feedback d-block" aria-live="polite">
                        {error}
                      </div>
                    )}
                    <small className="form-text text-muted mt-2 d-block">
                      Можно вставить текст QR-кода или отсканировать его
                    </small>
                  </div>

                  <div id="result-container" className="mb-4" style={{ position: 'relative', minHeight: '100px' }}>
                    <div className={`qr-loading-indicator text-center ${loading ? 'qr-loading-show' : ''}`}>
                      <div className="text-center w-100">
                        <div className="spinner-border text-primary" role="status" aria-hidden="true">
                          <span className="visually-hidden">Загрузка...</span>
                        </div>
                        <p className="mt-2 text-muted small mb-0">Проверка QR-кода...</p>
                      </div>
                    </div>

                    {result && result.success && (
                      <div className="qr-result-card qr-result-success" role="alert">
                        <div className="d-flex align-items-start">
                          <div className="qr-result-icon me-3">
                            <i className="bi bi-check-circle-fill"></i>
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-2">Доступ разрешён</h5>
                            <p className="mb-0">{result.message}</p>
                            {result.data && (
                              <div className="qr-result-details mt-3 pt-3" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                {result.data.name && (
                                  <div className="small mb-2"><strong>ФИО:</strong> {result.data.name}</div>
                                )}
                                {result.data.user_id && (
                                  <div className="small mb-2"><strong>ID:</strong> {result.data.user_id}</div>
                                )}
                                {result.data.organization && (
                                  <div className="small mb-2"><strong>Организация:</strong> {result.data.organization}</div>
                                )}
                                {result.data.role && (
                                  <div className="small mb-2"><strong>Должность:</strong> {result.data.role}</div>
                                )}
                                {result.data.telegram_id && (
                                  <div className="small mb-2"><strong>Telegram ID:</strong> {result.data.telegram_id}</div>
                                )}
                                {result.data.access_granted !== undefined && (
                                  <div className="small mb-2">
                                    <strong>Статус доступа:</strong>{' '}
                                    <span className={result.data.access_granted ? 'text-success' : 'text-danger'}>
                                      {result.data.access_granted ? 'Разрешён' : 'Запрещён'}
                                    </span>
                                  </div>
                                )}
                                {result.data.timestamp && (
                                  <div className="small text-muted mt-2 pt-2" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                    <strong>Время проверки:</strong> {formatTimestamp(result.data.timestamp)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {result && !result.success && (
                      <div className="qr-result-card qr-result-error" role="alert">
                        <div className="d-flex align-items-start">
                          <div className="qr-result-icon me-3">
                            <i className="bi bi-x-circle-fill"></i>
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-2">Доступ запрещён</h5>
                            <p className="mb-0">{result.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                      <i className="bi bi-check-circle me-2"></i>Проверить
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-lg" onClick={handleClear} disabled={loading}>
                      <i className="bi bi-x-circle me-2"></i>Очистить
                    </button>
                    <Link to="/dashboard" className="btn btn-outline-secondary btn-lg ms-auto">
                      <i className="bi bi-arrow-left me-2"></i>Вернуться
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mt-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-clock-history me-2"></i>История проверок
                  </h5>
                  <div className="d-flex gap-2">
                    {history.length > 0 && isHistoryExpanded && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearAllHistory}
                        title="Очистить всю историю"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={toggleHistory}
                    >
                      <i className={`bi ${isHistoryExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} id="history-chevron"></i>
                    </button>
                  </div>
                </div>

                {isHistoryExpanded && (
                  <>
                    <div className="mb-3">
                      <div className="input-group">
                        <span className="input-group-text"><i className="bi bi-search"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Поиск по истории..."
                          autoComplete="off"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                        />
                        {historySearch && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setHistorySearch('')}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      {history.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                          <p className="mt-2 mb-0">История проверок пуста</p>
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-search" style={{ fontSize: '2rem' }}></i>
                          <p className="mt-2 mb-0">Ничего не найдено</p>
                        </div>
                      ) : (
                        <div className="list-group">
                          {filteredHistory.map((item, index) => {
                            const statusClass = item.success ? 'text-success' : 'text-danger';
                            const statusIcon = item.success ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
                            const statusText = item.success ? 'Успех' : 'Отказ';
                            
                            let displayMessage = item.message || '';
                            displayMessage = displayMessage.replace(/access\s+granted/gi, 'QR-код действителен. Доступ разрешён.');
                            displayMessage = displayMessage.replace(/QR-код действителен\. Доступ разрешён\.\s*QR-код действителен\. Доступ разрешён\./gi, 'QR-код действителен. Доступ разрешён.');
                            displayMessage = displayMessage.trim();
                            if (!displayMessage) {
                              displayMessage = 'QR-код действителен. Доступ разрешён.';
                            }

                            return (
                              <div
                                key={index}
                                className="list-group-item list-group-item-action qr-history-item"
                                style={{ cursor: 'pointer' }}
                                onClick={() => useFromHistory(item.qrCode)}
                              >
                                <div className="d-flex align-items-start">
                                  <div className={`qr-history-icon me-3 ${statusClass}`}>
                                    <i className={`bi ${statusIcon}`} style={{ fontSize: '1.25rem' }}></i>
                                  </div>
                                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                      <div
                                        className="fw-semibold text-truncate"
                                        style={{ fontSize: '0.875rem', fontFamily: "'Courier New', monospace" }}
                                        title={item.qrCode}
                                      >
                                        {truncateText(item.qrCode, 50)}
                                      </div>
                                      <small className="text-muted ms-2" style={{ whiteSpace: 'nowrap' }}>
                                        {formatTime(item.timestamp)}
                                      </small>
                                    </div>
                                    <div className={`small ${statusClass} mb-1`}>
                                      <i className={`bi ${statusIcon} me-1`}></i>{statusText}
                                    </div>
                                    <div className="small text-muted text-truncate" title={displayMessage}>
                                      {truncateText(displayMessage, 80)}
                                    </div>
                                    {item.user && (
                                      <div className="small text-muted text-truncate" title={item.user}>
                                        <strong>Пользователь:</strong> {truncateText(item.user, 80)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="d-flex gap-1 ms-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => useFromHistory(item.qrCode)}
                                      title="Использовать этот QR-код"
                                    >
                                      <i className="bi bi-arrow-return-left"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => deleteHistoryItem(item.qrCode)}
                                      title="Удалить из истории"
                                    >
                                      <i className="bi bi-x"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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

export default ScanQR;
