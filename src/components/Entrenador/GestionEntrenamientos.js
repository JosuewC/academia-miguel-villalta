// src/components/Entrenador/GestionEntrenamientos.js
import React, { useState, useEffect } from 'react';
import { 
  getEntrenamientos, addEntrenamiento, updateEntrenamiento, deleteEntrenamiento,
  getAsistenciaEntrenamientos, getJugadores
} from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './GestionEntrenamientos.css';

function GestionEntrenamientos({ onDataChange, showToast: propShowToast }) {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verAsistencia, setVerAsistencia] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [asistenciaData, setAsistenciaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    lugar: '',
    duracion: '2 horas',
    objetivo: '',
    monto_pago: ''
  });

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [entrenamientosData, jugadoresData] = await Promise.all([
        getEntrenamientos(),
        getJugadores()
      ]);
      setEntrenamientos(entrenamientosData);
      setJugadores(jugadoresData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los entrenamientos', 'error');
    }
    setLoading(false);
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

  const enviarNotificacionEntrenamiento = async (entrenamiento) => {
    try {
      const response = await fetch('http://localhost:5001/api/enviar-notificacion-entrenamiento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entrenamiento: entrenamiento,
          jugadores: jugadores
        })
      });
      
      if (response.ok) {
        console.log('✅ Notificaciones enviadas a todos los jugadores');
        return true;
      } else {
        console.error('Error enviando notificaciones');
        return false;
      }
    } catch (error) {
      console.error('Error al enviar notificaciones:', error);
      return false;
    }
  };

  // CANCELAR entrenamiento (con notificación)
  const handleCancelar = async (id, fecha, lugar) => {
    setConfirmConfig({
      title: 'Cancelar Entrenamiento',
      message: `¿Cancelar el entrenamiento del ${formatearFecha(fecha)} en ${lugar}?\n\nSe enviará una notificación a TODOS los jugadores.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:5001/api/entrenamientos/${id}/cancelar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            showToast('✅ Entrenamiento cancelado. Notificaciones enviadas a los jugadores', 'success');
            await cargarDatos();
            if (onDataChange) onDataChange();
          } else {
            const error = await response.json();
            showToast('Error al cancelar: ' + error.error, 'error');
          }
          setShowConfirmModal(false);
        } catch (error) {
          showToast('Error al cancelar: ' + error.message, 'error');
          setShowConfirmModal(false);
        }
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'danger'
    });
    setShowConfirmModal(true);
  };

  // ELIMINAR entrenamiento (sin notificación - solo limpieza)
  const handleEliminar = (id, fecha) => {
    setConfirmConfig({
      title: 'Eliminar Entrenamiento',
      message: `¿Eliminar el entrenamiento del ${formatearFecha(fecha)}?\n\n⚠️ Esto NO enviará notificaciones a los jugadores. Es solo para limpieza de registros.`,
      onConfirm: async () => {
        try {
          await deleteEntrenamiento(id);
          await cargarDatos();
          showToast('Entrenamiento eliminado correctamente', 'success');
          if (onDataChange) onDataChange();
          setShowConfirmModal(false);
        } catch (error) {
          showToast('Error al eliminar: ' + error.message, 'error');
          setShowConfirmModal(false);
        }
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'info'
    });
    setShowConfirmModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const datosEnvio = {
        ...formData,
        monto_pago: formData.monto_pago === '' ? 0 : parseFloat(formData.monto_pago)
      };

      if (editando) {
        await updateEntrenamiento(editando.id, datosEnvio);
        showToast('Entrenamiento actualizado correctamente', 'success');
      } else {
        const nuevo = await addEntrenamiento(datosEnvio);
        await enviarNotificacionEntrenamiento(datosEnvio);
        showToast('Entrenamiento agendado. Notificaciones enviadas a los jugadores', 'success');
      }
      setShowForm(false);
      setEditando(null);
      setFormData({ fecha: '', hora: '', lugar: '', duracion: '2 horas', objetivo: '', monto_pago: '' });
      await cargarDatos();
      if (onDataChange) onDataChange();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const verListaAsistencia = async (entrenamiento) => {
    setLoading(true);
    try {
      const asistencia = await getAsistenciaEntrenamientos();
      const filtrada = asistencia.filter(a => a.entrenamiento_id === entrenamiento.id);
      setAsistenciaData(filtrada);
      setVerAsistencia(entrenamiento);
    } catch (error) {
      showToast('Error al cargar asistencia: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      }
      return fecha;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const getJugadoresPorCategoria = () => {
    const asistiran = [];
    const noAsistiran = [];
    const sinResponder = [];

    jugadores.forEach(jugador => {
      const registro = asistenciaData.find(a => a.jugador_id === jugador.id);
      const estado = registro?.estado || 'no_apuntado';
      
      if (estado === 'apuntado') {
        asistiran.push({ ...jugador, estado });
      } else if (estado === 'falta') {
        noAsistiran.push({ ...jugador, estado });
      } else {
        sinResponder.push({ ...jugador, estado: 'no_apuntado' });
      }
    });

    return { asistiran, noAsistiran, sinResponder };
  };

  // Verificar si un entrenamiento es futuro (para mostrar botón cancelar)
  const esFuturo = (fecha) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaObj = new Date(fecha);
    return fechaObj >= hoy;
  };

  if (loading && entrenamientos.length === 0) {
    return <div className="loading-container">Cargando entrenamientos...</div>;
  }

  return (
    <div className="gestion-entrenamientos">
      <div className="header-actions">
        <h2><i className="fas fa-futbol"></i> Gestionar Entrenamientos</h2>
        <button className="btn-agregar" onClick={() => { setShowForm(true); setEditando(null); }}>
          <i className="fas fa-plus"></i> <span>Agendar</span>
        </button>
      </div>

      <div className="entrenamientos-list">
        {entrenamientos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-alt"></i>
            <p>No hay entrenamientos programados</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Agendar primer entrenamiento</button>
          </div>
        ) : (
          entrenamientos.map(ent => {
            const esEventoFuturo = esFuturo(ent.fecha);
            
            return (
              <div key={ent.id} className="entrenamiento-card">
                <div className="entrenamiento-header">
                  <div className="fecha-info">
                    <i className="fas fa-calendar"></i>
                    <div>
                      <h3>{formatearFecha(ent.fecha)}</h3>
                      <p><i className="fas fa-clock"></i> {formatearHora(ent.hora)} · {ent.lugar}</p>
                    </div>
                  </div>
                  {ent.monto_pago > 0 && (
                    <div className="monto-info">
                      <span className="monto">💰 ${ent.monto_pago}</span>
                    </div>
                  )}
                </div>
                
                <div className="entrenamiento-body">
                  <div className="objetivo">
                    <i className="fas fa-bullseye"></i>
                    <strong>Objetivo:</strong> {ent.objetivo || 'No especificado'}
                  </div>
                  <div className="duracion">
                    <i className="fas fa-hourglass-half"></i>
                    <strong>Duración:</strong> {ent.duracion || 'No especificada'}
                  </div>
                </div>
                
                <div className="entrenamiento-footer">
                  <button className="btn-asistencia" onClick={() => verListaAsistencia(ent)}>
                    <i className="fas fa-clipboard-list"></i> <span>Ver Asistencia</span>
                  </button>
                  <button className="btn-editar" onClick={() => { 
                    setEditando(ent); 
                    setFormData({
                      fecha: ent.fecha,
                      hora: ent.hora,
                      lugar: ent.lugar,
                      duracion: ent.duracion || '2 horas',
                      objetivo: ent.objetivo || '',
                      monto_pago: ent.monto_pago || ''
                    }); 
                    setShowForm(true); 
                  }}>
                    <i className="fas fa-edit"></i>
                  </button>
                  
                  {/* Botón CANCELAR - solo para eventos futuros (envía notificación) */}
                  {esEventoFuturo && (
                    <button className="btn-cancelar" onClick={() => handleCancelar(ent.id, ent.fecha, ent.lugar)}>
                      <i className="fas fa-ban"></i> Cancelar
                    </button>
                  )}
                  
                  {/* Botón ELIMINAR - siempre visible (NO envía notificación) */}
                  <button className="btn-eliminar" onClick={() => handleEliminar(ent.id, ent.fecha)}>
                    <i className="fas fa-trash"></i> Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? '✏️ Editar Entrenamiento' : '📅 Agendar Entrenamiento'}</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label><i className="fas fa-calendar"></i> Fecha *</label>
                  <input type="date" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label><i className="fas fa-clock"></i> Hora *</label>
                  <input type="time" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} required />
                </div>
              </div>
              
              <div className="form-group">
                <label><i className="fas fa-map-marker-alt"></i> Lugar *</label>
                <input type="text" value={formData.lugar} onChange={(e) => setFormData({...formData, lugar: e.target.value})} required />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label><i className="fas fa-hourglass-half"></i> Duración</label>
                  <select value={formData.duracion} onChange={(e) => setFormData({...formData, duracion: e.target.value})}>
                    <option>1 hora</option>
                    <option>1.5 horas</option>
                    <option>2 horas</option>
                    <option>2.5 horas</option>
                    <option>3 horas</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><i className="fas fa-dollar-sign"></i> Monto a pagar ($)</label>
                  <input 
                    type="number" 
                    value={formData.monto_pago} 
                    onChange={(e) => setFormData({...formData, monto_pago: e.target.value})} 
                    placeholder="0 = gratis"
                    step="1"
                    min="0"
                  />
                  <small>Ingrese el monto que cada jugador debe pagar (ej: 5000, 10000)</small>
                </div>
              </div>
              
              <div className="form-group">
                <label><i className="fas fa-bullseye"></i> Objetivo</label>
                <textarea 
                  rows="3" 
                  value={formData.objetivo} 
                  onChange={(e) => setFormData({...formData, objetivo: e.target.value})} 
                  placeholder="Objetivo del entrenamiento..."
                />
              </div>
              
              <div className="form-buttons">
                <button type="button" className="btn-cancelar" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar" disabled={loading}>
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : (editando ? 'Actualizar' : 'Agendar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asistencia - SOLO LECTURA */}
      {verAsistencia && (() => {
        const { asistiran, noAsistiran, sinResponder } = getJugadoresPorCategoria();
        
        return (
          <div className="modal-overlay" onClick={() => setVerAsistencia(null)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="fas fa-clipboard-list"></i> Asistencia - {formatearFecha(verAsistencia.fecha)}</h3>
                <button className="close-btn" onClick={() => setVerAsistencia(null)}>&times;</button>
              </div>
              
              <div className="asistencia-resumen">
                <div className="resumen-card verde">
                  <span className="emoji">✅</span>
                  <div>
                    <strong>{asistiran.length}</strong>
                    <p>Asistirán</p>
                  </div>
                </div>
                <div className="resumen-card roja">
                  <span className="emoji">❌</span>
                  <div>
                    <strong>{noAsistiran.length}</strong>
                    <p>No asistirán</p>
                  </div>
                </div>
                <div className="resumen-card gris">
                  <span className="emoji">⭕</span>
                  <div>
                    <strong>{sinResponder.length}</strong>
                    <p>Sin responder</p>
                  </div>
                </div>
              </div>

              {asistiran.length > 0 && (
                <div className="asistencia-seccion">
                  <div className="seccion-titulo verde">
                    <i className="fas fa-check-circle"></i> ✅ Asistirán ({asistiran.length})
                  </div>
                  {asistiran.map(jugador => (
                    <div key={jugador.id} className="asistencia-item-view">
                      <div className="jugador-info">
                        <span className="numero">#{jugador.numero_camiseta || '?'}</span>
                        <span className="nombre">{jugador.nombre}</span>
                        <span className="posicion">{jugador.posicion || 'Sin posición'}</span>
                      </div>
                      <div className="estado-badge-view verde">
                        <span>✅ Asistirá</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {noAsistiran.length > 0 && (
                <div className="asistencia-seccion">
                  <div className="seccion-titulo roja">
                    <i className="fas fa-times-circle"></i> ❌ No asistirán ({noAsistiran.length})
                  </div>
                  {noAsistiran.map(jugador => (
                    <div key={jugador.id} className="asistencia-item-view">
                      <div className="jugador-info">
                        <span className="numero">#{jugador.numero_camiseta || '?'}</span>
                        <span className="nombre">{jugador.nombre}</span>
                        <span className="posicion">{jugador.posicion || 'Sin posición'}</span>
                      </div>
                      <div className="estado-badge-view roja">
                        <span>❌ No asistirá</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sinResponder.length > 0 && (
                <div className="asistencia-seccion">
                  <div className="seccion-titulo gris">
                    <i className="fas fa-question-circle"></i> ⭕ Sin responder ({sinResponder.length})
                  </div>
                  {sinResponder.map(jugador => (
                    <div key={jugador.id} className="asistencia-item-view">
                      <div className="jugador-info">
                        <span className="numero">#{jugador.numero_camiseta || '?'}</span>
                        <span className="nombre">{jugador.nombre}</span>
                        <span className="posicion">{jugador.posicion || 'Sin posición'}</span>
                      </div>
                      <div className="estado-badge-view gris">
                        <span>⭕ Sin responder</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-cerrar" onClick={() => setVerAsistencia(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          type={confirmConfig.type}
        />
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

export default GestionEntrenamientos;