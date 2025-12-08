import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../services/api';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/auth/staff');
      const guardsOnly = (response.data || []).filter(staff => staff.role === 'guard');
      setStaff(guardsOnly);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки охранников');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim() || !formData.password) {
      setFormError('Заполните все поля');
      return;
    }

    try {
      await api.post('/auth/register', {
        username: formData.username.trim(),
        password: formData.password
      });
      setShowModal(false);
      setFormData({ username: '', password: '' });
      loadStaff();
    } catch (err) {
      const errorData = err.response?.data || {};
      setFormError(errorData.detail || 'Ошибка регистрации');
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого охранника?')) {
      return;
    }

    try {
      await api.delete(`/auth/staff/${staffId}`);
      loadStaff();
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <>
      <Navbar />
      <main className="container py-4">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="h4 mb-0">
                <i className="bi bi-shield-check me-2"></i>Управление охранниками
              </h1>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-person-plus me-1"></i>Добавить охранника
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={loadStaff}>
                  <i className="bi bi-arrow-clockwise me-1"></i>Обновить
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Загрузка...</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Логин</th>
                      <th>Роль</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-4">
                          Нет данных
                        </td>
                      </tr>
                    ) : (
                      staff.map((member) => (
                        <tr key={member.id}>
                          <td>{member.username}</td>
                          <td>
                            <span className="badge bg-secondary">
                              Охранник
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(member.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Добавить охранника</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ username: '', password: '' });
                    setFormError('');
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger" role="alert">
                      {formError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">Логин</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Пароль</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ username: '', password: '' });
                      setFormError('');
                    }}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Staff;

