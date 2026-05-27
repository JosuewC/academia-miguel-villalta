// src/components/Entrenador/ControlAsistencia.js
import React, { useState, useEffect } from 'react';
import { 
  getJugadores, getEntrenamientos, getPartidos,
  getAsistenciaEntrenamientos, getAsistenciaPartidos
} from '../../database/db';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import './ControlAsistencia.css';

function ControlAsistencia({ onDataChange, showToast: propShowToast }) {
  const [jugadores, setJugadores] = useState([]);
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [asistenciaEntrenamientos, setAsistenciaEntrenamientos] = useState([]);
  const [asistenciaPartidos, setAsistenciaPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroJugador, setFiltroJugador] = useState('');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [refrescar, setRefrescar] = useState(false);
  
  // Usar toast del padre o el local
  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, [refrescar]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [jugadoresData, entrenamientosData, partidosData, asisEntrenamientos, asisPartidos] = await Promise.all([
        getJugadores(),
        getEntrenamientos(),
        getPartidos(),
        getAsistenciaEntrenamientos(),
        getAsistenciaPartidos()
      ]);
      setJugadores(jugadoresData);
      setEntrenamientos(entrenamientosData);
      setPartidos(partidosData);
      setAsistenciaEntrenamientos(asisEntrenamientos);
      setAsistenciaPartidos(asisPartidos);
      console.log('✅ Datos cargados:', {
        jugadores: jugadoresData.length,
        entrenamientos: entrenamientosData.length,
        partidos: partidosData.length,
        asistenciasEntrenamientos: asisEntrenamientos.length,
        asistenciasPartidos: asisPartidos.length
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los datos de asistencia', 'error');
    }
    setLoading(false);
  };

  // Función para refrescar datos desde el escáner QR
  const refrescarDatos = () => {
    setRefrescar(!refrescar);
    showToast('Datos actualizados', 'success');
    if (onDataChange) onDataChange();
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return fecha;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const formatearHora = (hora) => {
    if (!hora) return '';
    try {
      let horaStr = hora.toString();
      if (horaStr.includes(':')) {
        const partes = horaStr.split(':');
        let horas = parseInt(partes[0]);
        const minutos = partes[1];
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        return `${horas}:${minutos} ${ampm}`;
      }
      return horaStr;
    } catch (e) {
      return hora;
    }
  };

  // Obtener todas las asistencias de un jugador (entrenamientos y partidos)
  const getAsistenciasJugador = (jugadorId) => {
    // Asistencias a entrenamientos (estado = 'asistio')
    const entrenamientosAsistidos = asistenciaEntrenamientos
      .filter(a => a.jugador_id === jugadorId && a.estado === 'asistio')
      .map(a => {
        const ent = entrenamientos.find(e => e.id === a.entrenamiento_id);
        return { 
          ...a, 
          tipo: 'entrenamiento', 
          evento: ent,
          fecha_scan: a.fecha_scan,
          scan_qr: a.scan_qr
        };
      });
    
    // Asistencias a partidos (estado = 'jugo')
    const partidosAsistidos = asistenciaPartidos
      .filter(a => a.jugador_id === jugadorId && a.estado === 'jugo')
      .map(a => {
        const part = partidos.find(p => p.id === a.partido_id);
        return { 
          ...a, 
          tipo: 'partido', 
          evento: part,
          fecha_scan: a.fecha_scan,
          scan_qr: a.scan_qr
        };
      });
    
    // Combinar y ordenar por fecha (más reciente primero)
    const todas = [...entrenamientosAsistidos, ...partidosAsistidos];
    return todas.sort((a, b) => {
      const fechaA = a.fecha_scan || a.evento?.fecha;
      const fechaB = b.fecha_scan || b.evento?.fecha;
      return new Date(fechaB) - new Date(fechaA);
    });
  };

  // Calcular estadísticas del jugador
  const getEstadisticasJugador = (jugadorId) => {
    const asistencias = getAsistenciasJugador(jugadorId);
    const entrenamientosCount = asistencias.filter(a => a.tipo === 'entrenamiento').length;
    const partidosCount = asistencias.filter(a => a.tipo === 'partido').length;
    const total = asistencias.length;
    const ultimaAsistencia = asistencias[0]?.fecha_scan || asistencias[0]?.evento?.fecha;
    
    return { entrenamientosCount, partidosCount, total, ultimaAsistencia };
  };

  const verHistorial = (jugador) => {
    setJugadorSeleccionado(jugador);
    setMostrarHistorial(true);
  };

  const jugadoresFiltrados = jugadores.filter(j => 
    j.nombre.toLowerCase().includes(filtroJugador.toLowerCase())
  );

  if (loading) {
    return <div className="loading-container">Cargando datos...</div>;
  }

  return (
    <div className="control-asistencia">
      <div className="header-actions">
        <h2><i className="fas fa-clipboard-list"></i> Control de Asistencia</h2>
        <button className="btn-refrescar" onClick={refrescarDatos}>
          <i className="fas fa-sync-alt"></i> Refrescar
        </button>
      </div>

      <div className="filtros">
        <div className="filtro-busqueda">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Buscar jugador por nombre..." 
            value={filtroJugador}
            onChange={(e) => setFiltroJugador(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de jugadores */}
      <div className="jugadores-lista">
        <h3><i className="fas fa-users"></i> Todos los Jugadores ({jugadores.length})</h3>
        <div className="jugadores-grid">
          {jugadoresFiltrados.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-search"></i>
              <p>No se encontraron jugadores</p>
            </div>
          ) : (
            jugadoresFiltrados.map(jugador => {
              const estadisticas = getEstadisticasJugador(jugador.id);
              
              return (
                <div key={jugador.id} className="jugador-card">
                  <div className="jugador-card-header">
                    <div className="avatar">
                      <i className="fas fa-user-circle"></i>
                    </div>
                    <div className="info">
                      <h4>{jugador.nombre}</h4>
                      <p>#{jugador.numero_camiseta || '?'} - {jugador.posicion || 'Sin posición'}</p>
                      <p className="email">{jugador.email}</p>
                    </div>
                  </div>
                  <div className="jugador-card-stats">
                    <div className="stat">
                      <span className="stat-number">{estadisticas.total}</span>
                      <span className="stat-label">Total Asistencias</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{estadisticas.entrenamientosCount}</span>
                      <span className="stat-label">Entrenamientos</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{estadisticas.partidosCount}</span>
                      <span className="stat-label">Partidos</span>
                    </div>
                  </div>
                  {estadisticas.ultimaAsistencia && (
                    <div className="ultima-asistencia">
                      <i className="fas fa-clock"></i>
                      <span>Última: {formatearFecha(estadisticas.ultimaAsistencia)}</span>
                    </div>
                  )}
                  <button className="btn-ver-historial" onClick={() => verHistorial(jugador)}>
                    <i className="fas fa-eye"></i> Ver historial completo
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Historial de Asistencia */}
      {mostrarHistorial && jugadorSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarHistorial(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-history"></i> 
                Historial de Asistencia - {jugadorSeleccionado.nombre}
              </h3>
              <button className="close-btn" onClick={() => setMostrarHistorial(false)}>&times;</button>
            </div>
            
            <div className="historial-lista">
              {getAsistenciasJugador(jugadorSeleccionado.id).length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-calendar-alt"></i>
                  <p>No hay registros de asistencia para este jugador</p>
                  <small>Escanea el QR del jugador para registrar su primera asistencia</small>
                </div>
              ) : (
                getAsistenciasJugador(jugadorSeleccionado.id).map((asis, idx) => (
                  <div key={idx} className="historial-item">
                    <div className="historial-fecha">
                      <i className="fas fa-calendar"></i>
                      <span>{formatearFecha(asis.evento?.fecha)}</span>
                      {asis.scan_qr && (
                        <span className="badge-qr" title="Registrado por QR">📱 QR</span>
                      )}
                    </div>
                    <div className="historial-info">
                      <span className="tipo">
                        {asis.tipo === 'entrenamiento' ? '🏃 Entrenamiento' : '🏆 Partido'}
                      </span>
                      <span className="lugar">{asis.evento?.lugar}</span>
                      {asis.tipo === 'partido' && asis.evento?.rival && (
                        <span className="rival">vs {asis.evento.rival}</span>
                      )}
                      <span className="hora">{formatearHora(asis.evento?.hora)}</span>
                    </div>
                    <div className="historial-estado">
                      <span className="badge-asistio">✅ Asistió</span>
                      {asis.fecha_scan && (
                        <span className="fecha-scan">
                          {new Date(asis.fecha_scan).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setMostrarHistorial(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast para notificaciones */}
      {toast && !propShowToast && (
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

export default ControlAsistencia;