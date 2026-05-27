import React, { useState, useEffect } from 'react';
import './DashboardEntrenador.css';
import GestionJugadores from './GestionJugadores';
import GestionEntrenamientos from './GestionEntrenamientos';
import GestionPartidos from './GestionPartidos';
import ControlPagos from './ControlPagos';
import ControlAsistencia from './ControlAsistencia';
import EscanerQR from './EscanerQR';
import { getCurrentUser, getJugadores, getPagosPendientes, getAsistenciaEntrenamientos, getEntrenamientos, logoutUser } from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';

function DashboardEntrenador() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [estadisticas, setEstadisticas] = useState({
    total_jugadores: 0,
    promedio_asistencia: 0,
    total_pendiente: 0
  });
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      
      const [jugadores, pagosPendientes, asistenciasEntrenamientos, entrenamientos] = await Promise.all([
        getJugadores(),
        getPagosPendientes(),
        getAsistenciaEntrenamientos(),
        getEntrenamientos()
      ]);
      
      const totalJugadores = jugadores.filter(j => j.activo !== false).length;
      
      let promedioAsistencia = 0;
      if (entrenamientos.length > 0 && totalJugadores > 0) {
        const entrenamientosOrdenados = [...entrenamientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const ultimos5 = entrenamientosOrdenados.slice(0, 5);
        
        let totalAsistencias = 0;
        let totalPosibles = 0;
        
        ultimos5.forEach(ent => {
          const asistenciasEvento = asistenciasEntrenamientos.filter(a => 
            a.entrenamiento_id === ent.id && a.estado === 'asistio'
          );
          totalAsistencias += asistenciasEvento.length;
          totalPosibles += totalJugadores;
        });
        
        promedioAsistencia = totalPosibles > 0 ? (totalAsistencias / totalPosibles) * 100 : 0;
      }
      
      let totalPendiente = 0;
      if (pagosPendientes.length > 0 && pagosPendientes[0].monto_total !== undefined) {
        totalPendiente = pagosPendientes.reduce((sum, p) => sum + (parseFloat(p.monto_total) || 0), 0);
      } else {
        const pagosNoPagados = pagosPendientes.filter(p => p.estado === 'pendiente');
        totalPendiente = pagosNoPagados.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
      }
      
      setEstadisticas({
        total_jugadores: totalJugadores,
        promedio_asistencia: promedioAsistencia,
        total_pendiente: totalPendiente
      });
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los datos', 'error');
    }
    setLoading(false);
  };

  const refrescarEstadisticas = () => {
    cargarDatos();
    showToast('Estadísticas actualizadas', 'success');
  };

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
    { id: 'dashboard', nombre: 'Dashboard', icono: 'fa-chart-line', mobileNombre: '📊' },
    { id: 'jugadores', nombre: 'Jugadores', icono: 'fa-users', mobileNombre: '👥' },
    { id: 'entrenamientos', nombre: 'Entrenamientos', icono: 'fa-futbol', mobileNombre: '⚽' },
    { id: 'partidos', nombre: 'Partidos', icono: 'fa-trophy', mobileNombre: '🏆' },
    { id: 'pagos', nombre: 'Pagos', icono: 'fa-dollar-sign', mobileNombre: '💰' },
    { id: 'asistencia', nombre: 'Control Asistencia', icono: 'fa-clipboard-list', mobileNombre: '📋' },
    { id: 'escaner', nombre: 'Escáner QR', icono: 'fa-qrcode', mobileNombre: '📷' }
  ];

  const renderContent = () => {
    if (loading && activeTab === 'dashboard') {
      return (
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando estadísticas...</p>
        </div>
      );
    }

    switch(activeTab) {
      case 'dashboard':
        return (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-users"></i></div>
                <div className="stat-info">
                  <h3>{estadisticas.total_jugadores}</h3>
                  <p>Jugadores Activos</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
                <div className="stat-info">
                  <h3>{estadisticas.promedio_asistencia.toFixed(1)}%</h3>
                  <p>Asistencia Promedio</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-clock"></i></div>
                <div className="stat-info">
                  <h3>${estadisticas.total_pendiente.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</h3>
                  <p>Pendiente por Cobrar</p>
                </div>
              </div>
            </div>
            
            <div className="refresh-stats">
              <button className="btn-refrescar-stats" onClick={refrescarEstadisticas}>
                <i className="fas fa-sync-alt"></i> Actualizar Estadísticas
              </button>
            </div>
          </>
        );
      case 'jugadores':
        return <GestionJugadores onDataChange={refrescarEstadisticas} showToast={showToast} />;
      case 'entrenamientos':
        return <GestionEntrenamientos onDataChange={refrescarEstadisticas} showToast={showToast} />;
      case 'partidos':
        return <GestionPartidos onDataChange={refrescarEstadisticas} showToast={showToast} />;
      case 'pagos':
        return <ControlPagos onDataChange={refrescarEstadisticas} showToast={showToast} />;
      case 'asistencia':
        return <ControlAsistencia onDataChange={refrescarEstadisticas} showToast={showToast} />;
      case 'escaner':
        return <EscanerQR onDataChange={refrescarEstadisticas} showToast={showToast} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-entrenador">
      {/* Header mobile */}
      <div className="mobile-header">
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

      {/* Navegación */}
      <nav className={`entrenador-nav ${menuOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <div className="nav-avatar">
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="nav-user">
            <span className="user-name">{user?.nombre || 'Entrenador'}</span>
            <span className="user-role">Entrenador</span>
          </div>
          <button className="btn-logout-sidebar" onClick={handleLogout} title="Cerrar Sesión">
            <i className="fas fa-sign-out-alt"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
            >
              <i className={`fas ${tab.icono}`}></i>
              <span className="tab-text">{tab.nombre}</span>
              <span className="tab-icon-mobile">{tab.mobileNombre}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="dashboard-content">
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

export default DashboardEntrenador;