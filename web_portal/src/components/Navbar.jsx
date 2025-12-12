import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary mb-3">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">Security</Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Переключить навигацию"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                to="/dashboard"
                aria-current="page"
              >
                Панель
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                to="/scan-qr"
              >
                Проверка QR
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                to="/visitors"
              >
                Посетители
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                to="/statistics"
              >
                Статистика
              </NavLink>
            </li>
            {isAdmin && (
              <>
                <li className="nav-item">
                  <NavLink 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    to="/staff"
                  >
                    Охранники
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    to="/api-panel"
                  >
                    Центр управления
                  </NavLink>
                </li>
              </>
            )}
          </ul>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={handleLogout}>
              Выход
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

