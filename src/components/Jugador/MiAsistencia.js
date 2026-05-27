// src/components/Jugador/MiAsistencia.js
import React, { useState, useEffect } from 'react';
import { 
  getEntrenamientos, getPartidos,
  getAsistenciaEntrenamientos, getAsistenciaPartidos,
  getCurrentUser
} from '../../database/db';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import './MiAsistencia.css';

function MiAsistencia({ showToast: propShowToast }) {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [asistenciaEntrenamientos, setAsistenciaEntrenamientos] = useState([]);
  const [asistenciaPartidos, setAsistenciaPartidos] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      
      const [entrenamientosData, partidosData, asisEntrenamientos, asisPartidos] = await Promise.all([
        getEntrenamientos(),
        getPartidos(),
        getAsistenciaEntrenamientos(),
        getAsistenciaPartidos()
      ]);
      
      setEntrenamientos(entrenamientosData || []);
      setPartidos(partidosData || []);
      setAsistenciaEntrenamientos(asisEntrenamientos || []);
      setAsistenciaPartidos(asisPartidos || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar tu historial de asistencia', 'error');
    }
    setLoading(false);
  };

  const getMiEstadoEntrenamiento = (entrenamientoId) => {
    const registro = asistenciaEntrenamientos.find(a => 
      a.entrenamiento_id === entrenamientoId && a.jugador_id === user?.id
    );
    return registro?.estado || 'no_apuntado';
  };

  const getMiEstadoPartido = (partidoId) => {
    const registro = asistenciaPartidos.find(a => 
      a.partido_id === partidoId && a.jugador_id === user?.id
    );
    return registro?.estado || 'no_convocado';
  };

  const getMisCamposPartido = (partidoId) => {
    const registro = asistenciaPartidos.find(a => 
      a.partido_id === partidoId && a.jugador_id === user?.id
    );
    return registro?.campos || 0;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return fecha;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const formatearHora = (hora) => {
    if (!hora) return 'Hora no disponible';
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

  const getEstadoTexto = (estado, tipo) => {
    if (tipo === 'entrenamiento') {
      const estados = {
        'apuntado': { text: '📋 Apuntado', class: 'estado-apuntado' },
        'asistio': { text: '✅ Asististe', class: 'estado-asistio' },
        'falta': { text: '❌ No asististe', class: 'estado-falta' },
        'no_apuntado': { text: '⭕ No respondiste', class: 'estado-no' }
      };
      return estados[estado] || estados.no_apuntado;
    } else {
      const estados = {
        'convocado': { text: '📋 Convocado', class: 'estado-convocado' },
        'jugo': { text: '⚽ Jugaste', class: 'estado-jugo' },
        'falta': { text: '❌ No jugaste', class: 'estado-falta' },
        'no_convocado': { text: '⭕ No respondiste', class: 'estado-no' }
      };
      return estados[estado] || estados.no_convocado;
    }
  };

  const entrenamientosConEstado = entrenamientos.map(e => ({
    ...e,
    estado: getMiEstadoEntrenamiento(e.id),
    tipo: 'entrenamiento'
  }));

  const partidosConEstado = partidos.map(p => ({
    ...p,
    estado: getMiEstadoPartido(p.id),
    campos: getMisCamposPartido(p.id),
    tipo: 'partido'
  }));

  const todosEventos = [...entrenamientosConEstado, ...partidosConEstado].sort((a, b) => {
    if (!a.fecha && !b.fecha) return 0;
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return new Date(b.fecha) - new Date(a.fecha);
  });

  const eventosFiltrados = todosEventos.filter(e => {
    if (filtro === 'todos') return true;
    if (filtro === 'entrenamientos') return e.tipo === 'entrenamiento';
    if (filtro === 'partidos') return e.tipo === 'partido';
    return true;
  });

  const estadisticas = {
    entrenamientosAsistidos: entrenamientosConEstado.filter(e => e.estado === 'asistio').length,
    partidosJugados: partidosConEstado.filter(p => p.estado === 'jugo').length,
    totalEntrenamientos: entrenamientos.length,
    totalPartidos: partidos.length,
    porcentajeEntrenamientos: entrenamientos.length > 0 
      ? Math.round((entrenamientosConEstado.filter(e => e.estado === 'asistio').length / entrenamientos.length) * 100)
      : 0,
    porcentajePartidos: partidos.length > 0
      ? Math.round((partidosConEstado.filter(p => p.estado === 'jugo').length / partidos.length) * 100)
      : 0
  };

  if (loading) {
    return (
      <div className="mi-asistencia">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando tu historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-asistencia">
      <div className="header-mi-asistencia">
        <h2><i className="fas fa-clipboard-list"></i> Mi Asistencia</h2>
        <p className="subtitle">Historial de tu participación en entrenamientos y partidos</p>
      </div>

      {/* Estadísticas */}
      <div className="stats-mi-asistencia">
        <div className="stat-card">
          <div className="stat-icon">⚽</div>
          <div className="stat-info">
            <h3>{estadisticas.entrenamientosAsistidos} / {estadisticas.totalEntrenamientos}</h3>
            <p>Entrenamientos asistidos</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${estadisticas.porcentajeEntrenamientos}%` }}></div>
            </div>
            <span className="porcentaje">{estadisticas.porcentajeEntrenamientos}%</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <h3>{estadisticas.partidosJugados} / {estadisticas.totalPartidos}</h3>
            <p>Partidos jugados</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${estadisticas.porcentajePartidos}%` }}></div>
            </div>
            <span className="porcentaje">{estadisticas.porcentajePartidos}%</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-asistencia">
        <button className={filtro === 'todos' ? 'active' : ''} onClick={() => setFiltro('todos')}>
          Todos
        </button>
        <button className={filtro === 'entrenamientos' ? 'active' : ''} onClick={() => setFiltro('entrenamientos')}>
          Entrenamientos
        </button>
        <button className={filtro === 'partidos' ? 'active' : ''} onClick={() => setFiltro('partidos')}>
          Partidos
        </button>
      </div>

      {/* Lista de eventos */}
      <div className="eventos-lista">
        {eventosFiltrados.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-alt"></i>
            <p>No hay eventos registrados</p>
          </div>
        ) : (
          eventosFiltrados.map(evento => {
            const estadoInfo = getEstadoTexto(evento.estado, evento.tipo);
            
            return (
              <div key={`${evento.tipo}_${evento.id}`} className={`evento-card ${evento.estado}`}>
                <div className="evento-fecha">
                  <span className="dia">{new Date(evento.fecha).getDate()}</span>
                  <span className="mes">{new Date(evento.fecha).toLocaleString('es', { month: 'short' })}</span>
                </div>
                <div className="evento-info">
                  <h4>{evento.tipo === 'entrenamiento' ? '🏃 Entrenamiento' : `🏆 Partido vs ${evento.rival}`}</h4>
                  <p><i className="fas fa-calendar"></i> {formatearFecha(evento.fecha)}</p>
                  <p><i className="fas fa-clock"></i> {formatearHora(evento.hora)}</p>
                  <p><i className="fas fa-map-marker-alt"></i> {evento.lugar}</p>
                  {evento.tipo === 'entrenamiento' && evento.objetivo && (
                    <p className="objetivo"><i className="fas fa-bullseye"></i> {evento.objetivo}</p>
                  )}
                  {evento.tipo === 'partido' && evento.campos > 0 && (
                    <p className="campos"><i className="fas fa-bus"></i> Reservaste {evento.campos} campo(s) en buseta</p>
                  )}
                </div>
                <div className="evento-estado">
                  <span className={`estado-badge ${estadoInfo.class}`}>{estadoInfo.text}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
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

export default MiAsistencia;