// src/components/Jugador/MisEntrenamientos.js
import React, { useState, useEffect } from 'react';
import { getEntrenamientos, getAsistenciaEntrenamientos, toggleApuntarseEntrenamiento, getCurrentUser } from '../../database/db';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import './MisEntrenamientos.css';

function MisEntrenamientos({ showToast: propShowToast }) {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      console.log('Usuario jugador:', currentUser);
      setUser(currentUser);
      
      const [entrenamientosData, asistenciaData] = await Promise.all([
        getEntrenamientos(),
        getAsistenciaEntrenamientos()
      ]);
      
      setEntrenamientos(entrenamientosData || []);
      setAsistencia(asistenciaData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los entrenamientos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVotar = async (entrenamientoId, estado) => {
    try {
      await toggleApuntarseEntrenamiento(entrenamientoId, user.id, estado);
      await cargarDatos();
      
      if (estado === 'apuntado') {
        showToast('Te has apuntado al entrenamiento', 'success');
      } else if (estado === 'falta') {
        showToast('Has indicado que no asistirás', 'info');
      }
    } catch (error) {
      showToast('Error al actualizar: ' + error.message, 'error');
    }
  };

  const getMiEstado = (entrenamientoId) => {
    const registro = asistencia.find(a => a.entrenamiento_id === entrenamientoId && a.jugador_id === user?.id);
    return registro?.estado || 'no_apuntado';
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

  const formatearFecha = (fecha) => {
    if (!fecha) return null;
    try {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const entrenamientosFuturos = entrenamientos.filter(e => {
    const fechaObj = formatearFecha(e.fecha);
    return fechaObj && fechaObj >= hoy;
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  const entrenamientosPasados = entrenamientos.filter(e => {
    const fechaObj = formatearFecha(e.fecha);
    return fechaObj && fechaObj < hoy;
  }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (loading) {
    return (
      <div className="mis-entrenamientos">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando entrenamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-entrenamientos">
      <div className="header-mis-entrenamientos">
        <h2><i className="fas fa-futbol"></i> Mis Entrenamientos</h2>
        <p className="subtitle">Indica si asistirás a cada entrenamiento</p>
      </div>

      {/* Próximos entrenamientos */}
      <div className="seccion-entrenamientos">
        <div className="seccion-header">
          <h3><i className="fas fa-calendar-alt"></i> Próximos Entrenamientos</h3>
          <span className="contador">{entrenamientosFuturos.length} programados</span>
        </div>
        
        {entrenamientosFuturos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-check"></i>
            <p>No hay entrenamientos programados próximamente</p>
          </div>
        ) : (
          <div className="entrenamientos-grid">
            {entrenamientosFuturos.map(ent => {
              const estado = getMiEstado(ent.id);
              const fechaObj = formatearFecha(ent.fecha);
              
              return (
                <div key={ent.id} className="entrenamiento-card-jugador">
                  <div className="fecha-destacada">
                    <span className="dia">{fechaObj ? fechaObj.getDate() : '?'}</span>
                    <span className="mes">{fechaObj ? fechaObj.toLocaleString('es', { month: 'short' }) : '???'}</span>
                  </div>
                  <div className="info-entrenamiento">
                    <h4>{fechaObj ? fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha no disponible'}</h4>
                    <p className="hora"><i className="fas fa-clock"></i> {formatearHora(ent.hora)}</p>
                    <p className="lugar"><i className="fas fa-map-marker-alt"></i> {ent.lugar}</p>
                    {ent.objetivo && (
                      <p className="objetivo"><i className="fas fa-bullseye"></i> {ent.objetivo}</p>
                    )}
                    {ent.monto_pago > 0 && (
                      <p className="monto"><i className="fas fa-dollar-sign"></i> <strong>Monto:</strong> ${ent.monto_pago}</p>
                    )}
                    {ent.duracion && (
                      <p className="duracion"><i className="fas fa-hourglass-half"></i> Duración: {ent.duracion}</p>
                    )}
                  </div>
                  <div className="accion-entrenamiento">
                    <div className="estado-actual">
                      {estado === 'apuntado' && <span className="estado-badge estado-asistire">✅ Asistiré</span>}
                      {estado === 'falta' && <span className="estado-badge estado-no-asistire">❌ No asistiré</span>}
                      {estado === 'no_apuntado' && <span className="estado-badge estado-sin-responder">⭕ Sin responder</span>}
                    </div>
                    <div className="botones-votacion">
                      <button 
                        onClick={() => handleVotar(ent.id, 'apuntado')} 
                        className={`btn-votar btn-si ${estado === 'apuntado' ? 'active' : ''}`}
                      >
                        ✅ Asistiré
                      </button>
                      <button 
                        onClick={() => handleVotar(ent.id, 'falta')} 
                        className={`btn-votar btn-no ${estado === 'falta' ? 'active' : ''}`}
                      >
                        ❌ No asistiré
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      {entrenamientosPasados.length > 0 && (
        <div className="seccion-entrenamientos historial">
          <div className="seccion-header">
            <h3><i className="fas fa-history"></i> Historial</h3>
            <span className="contador">{entrenamientosPasados.length} entrenamientos</span>
          </div>
          <div className="historial-grid">
            {entrenamientosPasados.map(ent => {
              const estado = getMiEstado(ent.id);
              const fechaObj = formatearFecha(ent.fecha);
              
              let estadoTexto = '';
              let estadoClase = '';
              if (estado === 'apuntado') {
                estadoTexto = '✅ Asistió';
                estadoClase = 'estado-asistio';
              } else if (estado === 'falta') {
                estadoTexto = '❌ No asistió';
                estadoClase = 'estado-falta';
              } else {
                estadoTexto = '⭕ Sin registrar';
                estadoClase = 'estado-no';
              }
              
              return (
                <div key={ent.id} className="historial-card">
                  <div className="fecha-historial">
                    <i className="fas fa-calendar"></i>
                    <span>{fechaObj ? fechaObj.toLocaleDateString() : 'Fecha no disponible'}</span>
                  </div>
                  <div className="info-historial">
                    <span className="lugar-historial">{ent.lugar}</span>
                    <span className={`estado-small ${estadoClase}`}>{estadoTexto}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

export default MisEntrenamientos;