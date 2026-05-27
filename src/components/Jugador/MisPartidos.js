// src/components/Jugador/MisPartidos.js
import React, { useState, useEffect } from 'react';
import { getPartidos, getAsistenciaPartidos, updateAsistenciaPartido, getCurrentUser } from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './MisPartidos.css';

function MisPartidos({ showToast: propShowToast }) {
  const [partidos, setPartidos] = useState([]);
  const [convocatoria, setConvocatoria] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarCampos, setMostrarCampos] = useState(null);
  const [camposSeleccionados, setCamposSeleccionados] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});

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
      
      const [partidosData, convocatoriaData] = await Promise.all([
        getPartidos(),
        getAsistenciaPartidos()
      ]);
      
      setPartidos(partidosData || []);
      setConvocatoria(convocatoriaData || []);
      
      const camposInit = {};
      (partidosData || []).forEach(part => {
        const registro = (convocatoriaData || []).find(c => c.partido_id === part.id && c.jugador_id === currentUser?.id);
        if (registro?.campos) {
          camposInit[part.id] = registro.campos;
        }
      });
      setCamposSeleccionados(camposInit);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los partidos', 'error');
    }
    setLoading(false);
  };

  const handleVotar = async (partidoId, estado, campos = 0) => {
    try {
      await updateAsistenciaPartido(partidoId, user.id, estado, false, campos);
      await cargarDatos();
      setMostrarCampos(null);
      
      if (estado === 'convocado') {
        if (campos > 0) {
          showToast(`Te has convocado al partido con ${campos} campo(s)`, 'success');
        } else {
          showToast('Te has convocado al partido', 'success');
        }
      } else if (estado === 'no_convocado') {
        showToast('Has cancelado tu convocatoria', 'info');
      }
    } catch (error) {
      showToast('Error al actualizar: ' + error.message, 'error');
    }
  };

  const handleConfirmarCampos = async (partidoId) => {
    const campos = camposSeleccionados[partidoId] || 1;
    const partido = partidos.find(p => p.id === partidoId);
    const total = campos * (partido?.valor_campo || 0);
    
    setConfirmConfig({
      title: 'Confirmar Reserva',
      message: `¿Confirmar ${campos} campo(s) por $${partido?.valor_campo || 0} cada uno?\n\nTotal: $${total}`,
      onConfirm: async () => {
        await handleVotar(partidoId, 'convocado', campos);
        setShowConfirmModal(false);
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'warning'
    });
    setShowConfirmModal(true);
  };

  const getValorCampo = (partidoId) => {
    const partido = partidos.find(p => p.id === partidoId);
    return partido?.valor_campo || 0;
  };

  const getMiEstado = (partidoId) => {
    const registro = convocatoria.find(c => c.partido_id === partidoId && c.jugador_id === user?.id);
    return registro?.estado || 'no_convocado';
  };

  const getMisCampos = (partidoId) => {
    const registro = convocatoria.find(c => c.partido_id === partidoId && c.jugador_id === user?.id);
    return registro?.campos || 0;
  };

  const getEstadoInfo = (estado) => {
    const estados = {
      'convocado': { text: '✅ Asistiré', class: 'estado-convocado', accion: 'Cancelar' },
      'jugo': { text: '⚽ Jugaste', class: 'estado-jugo', accion: null },
      'falta': { text: '❌ No asististe', class: 'estado-falta', accion: null },
      'no_convocado': { text: '⭕ Sin responder', class: 'estado-no', accion: 'Asistiré' }
    };
    return estados[estado] || estados.no_convocado;
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
  
  const partidosFuturos = partidos.filter(p => {
    const fechaObj = formatearFecha(p.fecha);
    return fechaObj && fechaObj >= hoy;
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  const partidosPasados = partidos.filter(p => {
    const fechaObj = formatearFecha(p.fecha);
    return fechaObj && fechaObj < hoy;
  }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (loading) {
    return (
      <div className="mis-partidos">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando partidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-partidos">
      <div className="header-mis-partidos">
        <h2><i className="fas fa-trophy"></i> Mis Partidos</h2>
        <p className="subtitle">Indica si asistirás a cada partido</p>
      </div>

      {/* Próximos partidos */}
      <div className="seccion-partidos">
        <div className="seccion-header">
          <h3><i className="fas fa-calendar-alt"></i> Próximos Partidos</h3>
          <span className="contador">{partidosFuturos.length} programados</span>
        </div>
        
        {partidosFuturos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-check"></i>
            <p>No hay partidos programados próximamente</p>
          </div>
        ) : (
          <div className="partidos-grid">
            {partidosFuturos.map(part => {
              const estado = getMiEstado(part.id);
              const estadoInfo = getEstadoInfo(estado);
              const fechaObj = formatearFecha(part.fecha);
              const camposReservados = getMisCampos(part.id);
              const mostrarSelector = mostrarCampos === part.id;
              const valorCampo = part.valor_campo || 0;
              const camposTemp = camposSeleccionados[part.id] || camposReservados || 1;
              const totalTemp = camposTemp * valorCampo;
              
              return (
                <div key={part.id} className="partido-card-jugador">
                  <div className="rival-destacado">
                    <i className="fas fa-trophy"></i>
                    <h3>vs {part.rival}</h3>
                  </div>
                  <div className="info-partido">
                    <h4>{fechaObj ? fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha no disponible'}</h4>
                    <p><i className="fas fa-clock"></i> {formatearHora(part.hora)}</p>
                    <p><i className="fas fa-map-marker-alt"></i> {part.lugar}</p>
                    {part.monto_pago > 0 && (
                      <p className="monto"><i className="fas fa-dollar-sign"></i> Aporte: ${part.monto_pago}</p>
                    )}
                    
                    {part.hay_buseta && (
                      <div className="buseta-info">
                        <p><i className="fas fa-bus"></i> Buseta: Sale de {part.lugar_salida} a las {formatearHora(part.hora_salida)}</p>
                        <p><i className="fas fa-ticket-alt"></i> Valor por campo: ${valorCampo}</p>
                        {camposReservados > 0 && (
                          <p className="campos-reservados"><i className="fas fa-check-circle"></i> Has reservado {camposReservados} campo(s) - Total: ${camposReservados * valorCampo}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="accion-partido">
                    <div className="estado-actual">
                      {estado === 'convocado' && <span className="estado-badge estado-convocado">✅ Asistiré</span>}
                      {estado === 'no_convocado' && <span className="estado-badge estado-no">⭕ Sin responder</span>}
                      {estado === 'jugo' && <span className="estado-badge estado-jugo">⚽ Jugaste</span>}
                      {estado === 'falta' && <span className="estado-badge estado-falta">❌ No asististe</span>}
                    </div>
                    
                    {estado === 'no_convocado' && (
                      <div className="botones-votacion">
                        {part.hay_buseta && !mostrarSelector ? (
                          <button 
                            onClick={() => setMostrarCampos(part.id)} 
                            className="btn-reservar-campos"
                          >
                            🚌 Reservar campos
                          </button>
                        ) : null}
                        
                        {mostrarSelector ? (
                          <div className="selector-campos">
                            <label>¿Cuántos campos necesitas?</label>
                            <div className="campos-input">
                              <button 
                                type="button"
                                onClick={() => setCamposSeleccionados({...camposSeleccionados, [part.id]: Math.max(1, camposTemp - 1)})}
                              >-</button>
                              <span>{camposTemp}</span>
                              <button 
                                type="button"
                                onClick={() => setCamposSeleccionados({...camposSeleccionados, [part.id]: camposTemp + 1})}
                              >+</button>
                            </div>
                            <p className="total-campos">Total: ${totalTemp}</p>
                            <div className="selector-botones">
                              <button onClick={() => handleConfirmarCampos(part.id)} className="btn-confirmar">
                                ✅ Confirmar
                              </button>
                              <button onClick={() => setMostrarCampos(null)} className="btn-cancelar-selector">
                                ❌ Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleVotar(part.id, 'convocado', 0)} 
                            className="btn-asistir"
                          >
                            ✅ Asistiré
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleVotar(part.id, 'no_convocado', 0)} 
                          className="btn-no-asistir"
                        >
                          ❌ No asistiré
                        </button>
                      </div>
                    )}
                    
                    {estado === 'convocado' && (
                      <div className="botones-votacion">
                        {part.hay_buseta && !mostrarSelector && (
                          <button 
                            onClick={() => setMostrarCampos(part.id)} 
                            className="btn-modificar-campos"
                          >
                            🚌 Modificar campos ({camposReservados})
                          </button>
                        )}
                        {mostrarSelector ? (
                          <div className="selector-campos">
                            <label>Modificar campos:</label>
                            <div className="campos-input">
                              <button 
                                type="button"
                                onClick={() => setCamposSeleccionados({...camposSeleccionados, [part.id]: Math.max(1, camposTemp - 1)})}
                              >-</button>
                              <span>{camposTemp}</span>
                              <button 
                                type="button"
                                onClick={() => setCamposSeleccionados({...camposSeleccionados, [part.id]: camposTemp + 1})}
                              >+</button>
                            </div>
                            <p className="total-campos">Total: ${totalTemp}</p>
                            <div className="selector-botones">
                              <button onClick={() => handleConfirmarCampos(part.id)} className="btn-confirmar">
                                ✅ Actualizar
                              </button>
                              <button onClick={() => setMostrarCampos(null)} className="btn-cancelar-selector">
                                ❌ Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleVotar(part.id, 'no_convocado', 0)} 
                            className="btn-cancelar-asistencia"
                          >
                            ❌ Cancelar asistencia
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial */}
      {partidosPasados.length > 0 && (
        <div className="seccion-partidos historial">
          <div className="seccion-header">
            <h3><i className="fas fa-history"></i> Historial de Partidos</h3>
            <span className="contador">{partidosPasados.length} partidos</span>
          </div>
          <div className="historial-grid">
            {partidosPasados.map(part => {
              const estado = getMiEstado(part.id);
              const estadoInfo = getEstadoInfo(estado);
              const fechaObj = formatearFecha(part.fecha);
              const campos = getMisCampos(part.id);
              const valorCampo = part.valor_campo || 0;
              
              return (
                <div key={part.id} className="historial-card">
                  <div className="fecha-historial">
                    <i className="fas fa-calendar"></i>
                    <span>{fechaObj ? fechaObj.toLocaleDateString() : 'Fecha no disponible'}</span>
                  </div>
                  <div className="info-historial">
                    <span className="rival-historial">vs {part.rival}</span>
                    {campos > 0 && (
                      <span className="campos-historial">🚐 {campos} campo(s) - ${campos * valorCampo}</span>
                    )}
                    <span className={`estado-small ${estadoInfo.class}`}>{estadoInfo.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

export default MisPartidos;