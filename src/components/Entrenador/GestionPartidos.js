// src/components/Entrenador/GestionPartidos.js
import React, { useState, useEffect } from 'react';
import { 
  getPartidos, addPartido, updatePartido, deletePartido,
  getAsistenciaPartidos, getJugadores
} from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './GestionPartidos.css';

function GestionPartidos({ onDataChange, showToast: propShowToast }) {
  const [partidos, setPartidos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [verConvocatoria, setVerConvocatoria] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [convocatoriaData, setConvocatoriaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    rival: '',
    lugar: '',
    monto_pago: '',
    hay_buseta: false,
    lugar_salida: '',
    hora_salida: '',
    valor_campo: ''
  });

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [partidosData, jugadoresData] = await Promise.all([
        getPartidos(),
        getJugadores()
      ]);
      setPartidos(partidosData);
      setJugadores(jugadoresData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los partidos', 'error');
    }
    setLoading(false);
  };

  const enviarNotificacionPartido = async (partido) => {
    try {
      const response = await fetch('http://localhost:5001/api/enviar-notificacion-partido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partido: partido,
          jugadores: jugadores
        })
      });
      
      if (response.ok) {
        console.log('✅ Notificaciones enviadas a todos los jugadores');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al enviar notificaciones:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const datosEnvio = {
        ...formData,
        monto_pago: formData.monto_pago === '' ? 0 : parseFloat(formData.monto_pago),
        valor_campo: formData.valor_campo === '' ? 0 : parseFloat(formData.valor_campo),
        hay_buseta: formData.hay_buseta === true
      };
      
      console.log('📤 Enviando partido:', datosEnvio);

      if (editando) {
        await updatePartido(editando.id, datosEnvio);
        showToast('Partido actualizado correctamente', 'success');
      } else {
        await addPartido(datosEnvio);
        await enviarNotificacionPartido(datosEnvio);
        showToast('✅ Partido programado. Se han enviado notificaciones a los jugadores.', 'success');
      }
      setShowForm(false);
      setEditando(null);
      setFormData({ 
        fecha: '', hora: '', rival: '', lugar: '', monto_pago: '',
        hay_buseta: false, lugar_salida: '', hora_salida: '', valor_campo: ''
      });
      await cargarDatos();
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = (id, rival, fecha) => {
    setConfirmConfig({
      title: 'Eliminar Partido',
      message: `¿Estás seguro de que deseas eliminar el partido vs ${rival} del ${fecha}?`,
      onConfirm: async () => {
        try {
          await deletePartido(id);
          await cargarDatos();
          showToast(`Partido vs ${rival} eliminado correctamente`, 'success');
          if (onDataChange) onDataChange();
          setShowConfirmModal(false);
        } catch (error) {
          showToast('Error al eliminar: ' + error.message, 'error');
          setShowConfirmModal(false);
        }
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'danger'
    });
    setShowConfirmModal(true);
  };

  const verListaConvocatoria = async (partido) => {
    setLoading(true);
    try {
      const convocatoria = await getAsistenciaPartidos();
      const filtrada = convocatoria.filter(c => c.partido_id === partido.id);
      setConvocatoriaData(filtrada);
      setVerConvocatoria(partido);
    } catch (error) {
      showToast('Error al cargar convocatoria: ' + error.message, 'error');
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
    const convocados = [];
    const jugaron = [];
    const faltaron = [];
    const sinResponder = [];

    jugadores.forEach(jugador => {
      const registro = convocatoriaData.find(c => c.jugador_id === jugador.id);
      const estado = registro?.estado || 'no_convocado';
      
      if (estado === 'convocado') {
        convocados.push({ ...jugador, estado, campos: registro?.campos || 0 });
      } else if (estado === 'jugo') {
        jugaron.push({ ...jugador, estado, campos: registro?.campos || 0 });
      } else if (estado === 'falta') {
        faltaron.push({ ...jugador, estado });
      } else {
        sinResponder.push({ ...jugador, estado: 'no_convocado' });
      }
    });

    return { convocados, jugaron, faltaron, sinResponder };
  };

  if (loading && partidos.length === 0) {
    return <div className="loading-container">Cargando partidos...</div>;
  }

  return (
    <div className="gestion-partidos">
      <div className="header-actions">
        <h2><i className="fas fa-trophy"></i> Gestionar Partidos</h2>
        <button className="btn-agregar" onClick={() => { setShowForm(true); setEditando(null); }}>
          <i className="fas fa-plus"></i> <span>Programar</span>
        </button>
      </div>

      <div className="partidos-list">
        {partidos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-trophy"></i>
            <p>No hay partidos programados</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Programar primer partido</button>
          </div>
        ) : (
          partidos.map(part => (
            <div key={part.id} className="partido-card">
              <div className="partido-header">
                <div className="rival-info">
                  <i className="fas fa-trophy"></i>
                  <div>
                    <h3>vs {part.rival}</h3>
                    <p><i className="fas fa-calendar"></i> {formatearFecha(part.fecha)}</p>
                    <p><i className="fas fa-clock"></i> {formatearHora(part.hora)} · {part.lugar}</p>
                  </div>
                </div>
                <div className="monto-info">
                  {part.monto_pago > 0 && (
                    <span className="monto">💰 ${part.monto_pago}</span>
                  )}
                </div>
              </div>
              
              {part.hay_buseta && (
                <div className="partido-buseta">
                  <i className="fas fa-bus"></i>
                  <strong>Buseta:</strong> Sale de {part.lugar_salida} a las {formatearHora(part.hora_salida)} - ${part.valor_campo || 0} por campo
                </div>
              )}
              
              <div className="partido-footer">
                <button className="btn-convocatoria" onClick={() => verListaConvocatoria(part)}>
                  <i className="fas fa-clipboard-list"></i> <span>Ver Convocatoria</span>
                </button>
                <button className="btn-editar" onClick={() => { 
                  setEditando(part); 
                  setFormData({
                    fecha: part.fecha,
                    hora: part.hora,
                    rival: part.rival,
                    lugar: part.lugar,
                    monto_pago: part.monto_pago || '',
                    hay_buseta: part.hay_buseta || false,
                    lugar_salida: part.lugar_salida || '',
                    hora_salida: part.hora_salida || '',
                    valor_campo: part.valor_campo || ''
                  }); 
                  setShowForm(true); 
                }}>
                  <i className="fas fa-edit"></i>
                </button>
                <button className="btn-eliminar" onClick={() => handleDelete(part.id, part.rival, formatearFecha(part.fecha))}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? '✏️ Editar Partido' : '🏆 Programar Partido'}</h3>
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
                <label><i className="fas fa-flag-checkered"></i> Rival *</label>
                <input type="text" value={formData.rival} onChange={(e) => setFormData({...formData, rival: e.target.value})} placeholder="Ej: Los Tigres" required />
              </div>
              
              <div className="form-group">
                <label><i className="fas fa-map-marker-alt"></i> Lugar del Partido *</label>
                <input type="text" value={formData.lugar} onChange={(e) => setFormData({...formData, lugar: e.target.value})} placeholder="Ej: Estadio Principal" required />
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

              <div className="form-group buseta-toggle">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={formData.hay_buseta} 
                    onChange={(e) => setFormData({...formData, hay_buseta: e.target.checked})} 
                  />
                  <i className="fas fa-bus"></i> ¿Hay buseta disponible?
                </label>
              </div>

              {formData.hay_buseta && (
                <div className="buseta-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label><i className="fas fa-map-marker-alt"></i> Lugar de Salida</label>
                      <input 
                        type="text" 
                        value={formData.lugar_salida} 
                        onChange={(e) => setFormData({...formData, lugar_salida: e.target.value})} 
                        placeholder="Ej: Cancha Municipal" 
                      />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-clock"></i> Hora de Salida</label>
                      <input 
                        type="time" 
                        value={formData.hora_salida} 
                        onChange={(e) => setFormData({...formData, hora_salida: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-dollar-sign"></i> Valor por campo (asiento)</label>
                    <input 
                      type="number" 
                      value={formData.valor_campo} 
                      onChange={(e) => setFormData({...formData, valor_campo: e.target.value})} 
                      placeholder="Ej: 300"
                      step="1"
                      min="0"
                    />
                    <small>Este valor se multiplicará por los campos que reserve cada jugador</small>
                  </div>
                </div>
              )}
              
              <div className="form-buttons">
                <button type="button" className="btn-cancelar" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar" disabled={loading}>
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : (editando ? 'Actualizar' : 'Programar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Convocatoria */}
      {verConvocatoria && (() => {
        const { convocados, jugaron, faltaron, sinResponder } = getJugadoresPorCategoria();
        
        return (
          <div className="modal-overlay" onClick={() => setVerConvocatoria(null)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><i className="fas fa-clipboard-list"></i> Convocatoria - vs {verConvocatoria.rival}</h3>
                <button className="close-btn" onClick={() => setVerConvocatoria(null)}>&times;</button>
              </div>
              
              <div className="convocatoria-resumen">
                <div className="resumen-card verde">
                  <span className="emoji">✅</span>
                  <div>
                    <strong>{convocados.length}</strong>
                    <p>Asistirán</p>
                  </div>
                </div>
                <div className="resumen-card azul">
                  <span className="emoji">⚽</span>
                  <div>
                    <strong>{jugaron.length}</strong>
                    <p>Jugaron</p>
                  </div>
                </div>
                <div className="resumen-card roja">
                  <span className="emoji">❌</span>
                  <div>
                    <strong>{faltaron.length}</strong>
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

              {convocados.length > 0 && (
                <div className="convocatoria-seccion">
                  <div className="seccion-titulo verde">
                    <i className="fas fa-check-circle"></i> ✅ Asistirán ({convocados.length})
                  </div>
                  {convocados.map(jugador => (
                    <div key={jugador.id} className="convocatoria-item-view">
                      <div className="jugador-info">
                        <span className="numero">#{jugador.numero_camiseta || '?'}</span>
                        <span className="nombre">{jugador.nombre}</span>
                        <span className="posicion">{jugador.posicion || 'Sin posición'}</span>
                      </div>
                      {verConvocatoria.hay_buseta && jugador.campos > 0 && (
                        <div className="campos-info">
                          <span className="campos-badge">🚐 {jugador.campos} campo(s)</span>
                        </div>
                      )}
                      <div className="estado-badge-view verde">
                        <span>✅ Asistirá</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {faltaron.length > 0 && (
                <div className="convocatoria-seccion">
                  <div className="seccion-titulo roja">
                    <i className="fas fa-times-circle"></i> ❌ No asistirán ({faltaron.length})
                  </div>
                  {faltaron.map(jugador => (
                    <div key={jugador.id} className="convocatoria-item-view">
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
                <div className="convocatoria-seccion">
                  <div className="seccion-titulo gris">
                    <i className="fas fa-question-circle"></i> ⭕ Sin responder ({sinResponder.length})
                  </div>
                  {sinResponder.map(jugador => (
                    <div key={jugador.id} className="convocatoria-item-view">
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

              {jugaron.length > 0 && (
                <div className="convocatoria-seccion">
                  <div className="seccion-titulo azul">
                    <i className="fas fa-futbol"></i> ⚽ Jugaron ({jugaron.length})
                  </div>
                  {jugaron.map(jugador => (
                    <div key={jugador.id} className="convocatoria-item-view">
                      <div className="jugador-info">
                        <span className="numero">#{jugador.numero_camiseta || '?'}</span>
                        <span className="nombre">{jugador.nombre}</span>
                        <span className="posicion">{jugador.posicion || 'Sin posición'}</span>
                      </div>
                      {verConvocatoria.hay_buseta && jugador.campos > 0 && (
                        <div className="campos-info">
                          <span className="campos-badge">🚐 {jugador.campos} campo(s)</span>
                        </div>
                      )}
                      <div className="estado-badge-view azul">
                        <span>⚽ Jugó</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-cerrar" onClick={() => setVerConvocatoria(null)}>Cerrar</button>
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

export default GestionPartidos;