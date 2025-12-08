import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '48px 0' }}>
        <div className="card border-0 shadow-sm rounded-4" style={{ 
          background: '#ffffff'
        }}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-5">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ 
                width: '80px', 
                height: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
              }}>
                <i className="bi bi-grid-1x2 text-white" style={{ fontSize: '32px' }}></i>
              </div>
            </div>
            <h1 className="h3 mb-3 text-center fw-bold">Панель управления</h1>
            <p className="text-muted mb-5 text-center" style={{ fontSize: '1.1rem' }}>
              Добро пожаловать! Выберите нужный раздел для работы.
            </p>
            <div className="d-flex justify-content-center gap-4 flex-wrap">
              <div className="text-center">
                <Link
                  className="btn btn-primary btn-tile"
                  to="/scan-qr"
                  aria-label="Страница проверки QR-кода"
                >
                  <i className="bi bi-qr-code-scan"></i>
                </Link>
                <div className="small text-muted mt-2">Проверка QR</div>
              </div>
              <div className="text-center">
                <Link
                  className="btn btn-primary btn-tile"
                  to="/visitors"
                  aria-label="Страница с данными о посетителях"
                >
                  <i className="bi bi-person-lines-fill"></i>
                </Link>
                <div className="small text-muted mt-2">Посетители</div>
              </div>
              <div className="text-center">
                <Link
                  className="btn btn-primary btn-tile"
                  to="/statistics"
                  aria-label="Страница со статистикой посещения"
                >
                  <i className="bi bi-graph-up"></i>
                </Link>
                <div className="small text-muted mt-2">Статистика</div>
              </div>
              {isAdmin && (
                <>
                  <div className="text-center">
                    <Link
                      className="btn btn-primary btn-tile"
                      to="/staff"
                      aria-label="Страница управления охранниками"
                    >
                      <i className="bi bi-shield-check"></i>
                    </Link>
                    <div className="small text-muted mt-2">Охранники</div>
                  </div>
                  <div className="text-center">
                    <Link
                      className="btn btn-primary btn-tile"
                      to="/api-panel"
                      aria-label="Панель управления"
                    >
                      <i className="bi bi-code-slash"></i>
                    </Link>
                    <div className="small text-muted mt-2">Панель управления</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;

