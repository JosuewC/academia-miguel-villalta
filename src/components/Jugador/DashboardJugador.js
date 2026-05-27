// src/components/Jugador/DashboardJugador.js
import React, { useState, useEffect } from 'react';
import './DashboardJugador.css';
import MisEntrenamientos from './MisEntrenamientos';
import MisPartidos from './MisPartidos';
import MiAsistencia from './MiAsistencia';
import MisPagos from './MisPagos';
import MiQR from './MiQR';
import { getCurrentUser, logoutUser } from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';

function DashboardJugador() {
  const [activeTab, setActiveTab] = useState('entrenamientos');
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    showToast('Sesión cerrada correctamente', 'success');
    setTimeout(() => {
      logoutUser();
      window.location.href = '/login';
    }, 500);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const tabs = [
    { id: 'entrenamientos', nombre: 'Entrenamientos', icono: 'fa-futbol', mobileIcon: '⚽' },
    { id: 'partidos', nombre: 'Partidos', icono: 'fa-trophy', mobileIcon: '🏆' },
    { id: 'asistencia', nombre: 'Mi Asistencia', icono: 'fa-clipboard-list', mobileIcon: '📋' },
    { id: 'pagos', nombre: 'Mis Pagos', icono: 'fa-dollar-sign', mobileIcon: '💰' },
    { id: 'miqr', nombre: 'Mi QR', icono: 'fa-qrcode', mobileIcon: '📱' }
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando tu información...</p>
        </div>
      );
    }

    switch(activeTab) {
      case 'entrenamientos':
        return <MisEntrenamientos showToast={showToast} />;
      case 'partidos':
        return <MisPartidos showToast={showToast} />;
      case 'asistencia':
        return <MiAsistencia showToast={showToast} />;
      case 'pagos':
        return <MisPagos showToast={showToast} />;
      case 'miqr':
        return <MiQR showToast={showToast} />;
      default:
        return <MisEntrenamientos showToast={showToast} />;
    }
  };

  return (
    <div className="dashboard-jugador">
      {/* Mobile Header */}
      <div className="mobile-header-jugador">
        <div className="mobile-logo">
          <i className="fas fa-futbol"></i>
          <span>Academia Miguel Villalta</span>
        </div>
        <div className="mobile-actions">
          <button className="btn-logout-mobile" onClick={handleLogout} title="Cerrar Sesión">
            <i className="fas fa-sign-out-alt"></i>
          </button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`jugador-nav ${menuOpen ? 'open' : ''}`}>
        <div className="nav-header-jugador">
          <div className="avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="user-info">
            <h3>{user?.nombre || user?.Nombre || 'Jugador'}</h3>
          </div>
          <button className="btn-logout-sidebar" onClick={handleLogout} title="Cerrar Sesión">
            <i className="fas fa-sign-out-alt"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="nav-tabs-jugador">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab-jugador ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
            >
              <i className={`fas ${tab.icono}`}></i>
              <span>{tab.nombre}</span>
              <span className="mobile-icon">{tab.mobileIcon}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="dashboard-content-jugador">
        {renderContent()}
      </div>

      {/* Modal de confirmación */}
      {showLogoutModal && (
        <ConfirmModal
          title="Cerrar Sesión"
          message="¿Estás seguro de que deseas cerrar sesión?"
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
          type="warning"
        />
      )}

      {/* Toast para notificaciones */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default DashboardJugador;