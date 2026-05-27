// src/components/Entrenador/ControlPagos.js
import React, { useState, useEffect } from 'react';
import { 
  getJugadores, 
  getPagosPendientes, 
  acumularDeuda, 
  registrarAbono
} from '../../database/db';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './ControlPagos.css';

function ControlPagos({ onDataChange, showToast: propShowToast }) {
  const [jugadores, setJugadores] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroJugador, setFiltroJugador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [refrescar, setRefrescar] = useState(false);
  
  // Estados para modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [showAbonoPrompt, setShowAbonoPrompt] = useState(false);
  const [abonoData, setAbonoData] = useState({});
  const [showDeudaPrompt, setShowDeudaPrompt] = useState(false);
  
  // Toast
  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, [refrescar]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [jugadoresData, pagosData] = await Promise.all([
        getJugadores(),
        getPagosPendientes()
      ]);
      setJugadores(jugadoresData);
      setPagos(pagosData);
      console.log('✅ Datos cargados:', { 
        jugadores: jugadoresData.length, 
        pagos: pagosData.length 
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los datos de pagos', 'error');
    }
    setLoading(false);
  };

  const refrescarDatos = () => {
    setRefrescar(!refrescar);
    showToast('Datos actualizados', 'success');
    if (onDataChange) onDataChange();
  };

  const formatearMoneda = (monto) => {
    if (monto === undefined || monto === null) return '$0.00';
    const numero = parseFloat(monto);
    if (isNaN(numero)) return '$0.00';
    return `$${numero.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDeudaPorJugador = (jugadorId) => {
    const pagoJugador = pagos.find(p => p.jugador_id === jugadorId);
    return pagoJugador ? parseFloat(pagoJugador.monto_total) : 0;
  };

  // Registrar abono
  const handleAbonar = async (jugadorId, jugadorNombre, deudaTotal) => {
    setAbonoData({ jugadorId, jugadorNombre, deudaTotal });
    setShowAbonoPrompt(true);
  };

  const procesarAbono = async () => {
    const abono = prompt(`Ingrese el monto a abonar para ${abonoData.jugadorNombre}\nDeuda actual: ${formatearMoneda(abonoData.deudaTotal)}`, abonoData.deudaTotal);
    
    if (!abono || isNaN(parseFloat(abono)) || parseFloat(abono) <= 0) {
      showToast('Monto inválido', 'error');
      setShowAbonoPrompt(false);
      return;
    }
    
    const abonoNum = parseFloat(abono);
    
    if (abonoNum >= abonoData.deudaTotal) {
      setConfirmConfig({
        title: 'Confirmar Pago',
        message: `¿Confirmar pago completo de ${formatearMoneda(abonoData.deudaTotal)} para ${abonoData.jugadorNombre}?`,
        onConfirm: async () => {
          await registrarAbono(abonoData.jugadorId, abonoData.deudaTotal, new Date().toISOString().split('T')[0], 'PAGO COMPLETO');
          showToast(`Pago completo de ${formatearMoneda(abonoData.deudaTotal)} registrado`, 'success');
          await cargarDatos();
          setMostrarDetalle(false);
          setShowConfirmModal(false);
          if (onDataChange) onDataChange();
        },
        onCancel: () => setShowConfirmModal(false),
        type: 'success'
      });
      setShowConfirmModal(true);
    } else {
      setConfirmConfig({
        title: 'Confirmar Abono',
        message: `¿Registrar abono de ${formatearMoneda(abonoNum)} para ${abonoData.jugadorNombre}? Queda pendiente ${formatearMoneda(abonoData.deudaTotal - abonoNum)}`,
        onConfirm: async () => {
          await registrarAbono(abonoData.jugadorId, abonoNum, new Date().toISOString().split('T')[0], 'ABONO');
          showToast(`Abono de ${formatearMoneda(abonoNum)} registrado. Saldo pendiente: ${formatearMoneda(abonoData.deudaTotal - abonoNum)}`, 'success');
          await cargarDatos();
          if (abonoData.deudaTotal - abonoNum <= 0.01) {
            setMostrarDetalle(false);
          }
          if (onDataChange) onDataChange();
          setShowConfirmModal(false);
        },
        onCancel: () => setShowConfirmModal(false),
        type: 'warning'
      });
      setShowConfirmModal(true);
    }
    setShowAbonoPrompt(false);
  };

  // Crear deuda manual
  const crearDeudaManual = () => {
    if (!jugadorSeleccionado) {
      showToast('Primero selecciona un jugador', 'warning');
      return;
    }
    setShowDeudaPrompt(true);
  };

  const procesarDeudaManual = async () => {
    const concepto = prompt('Descripción de la deuda (ej: Cuota mensual, Uniforme, etc.):', 'Deuda manual');
    if (!concepto) {
      setShowDeudaPrompt(false);
      return;
    }
    
    const monto = prompt('Monto de la deuda:', '0');
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      showToast('Monto inválido', 'error');
      setShowDeudaPrompt(false);
      return;
    }
    
    const montoNum = parseFloat(monto);
    const deudaActual = getDeudaPorJugador(jugadorSeleccionado.id);
    
    setConfirmConfig({
      title: 'Confirmar Deuda',
      message: `¿Agregar deuda de ${formatearMoneda(montoNum)} para ${jugadorSeleccionado.nombre} por concepto: ${concepto}?\n\nDeuda actual: ${formatearMoneda(deudaActual)}\nNueva deuda total: ${formatearMoneda(deudaActual + montoNum)}`,
      onConfirm: async () => {
        try {
          await acumularDeuda(jugadorSeleccionado.id, montoNum, concepto);
          showToast(`Deuda de ${formatearMoneda(montoNum)} agregada a ${jugadorSeleccionado.nombre}`, 'success');
          await cargarDatos();
          if (onDataChange) onDataChange();
        } catch (error) {
          showToast('Error al crear la deuda: ' + error.message, 'error');
        }
        setShowConfirmModal(false);
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'warning'
    });
    setShowConfirmModal(true);
    setShowDeudaPrompt(false);
  };

  // Pagar toda la deuda
  const handlePagarTodos = async (jugadorId, jugadorNombre, deudaTotal) => {
    if (deudaTotal === 0) {
      showToast('Este jugador no tiene deuda pendiente', 'info');
      return;
    }
    
    setConfirmConfig({
      title: 'Confirmar Pago Total',
      message: `¿Confirmar pago de TODA la deuda (${formatearMoneda(deudaTotal)}) para ${jugadorNombre}?`,
      onConfirm: async () => {
        try {
          await registrarAbono(jugadorId, deudaTotal, new Date().toISOString().split('T')[0], 'PAGO TOTAL DE DEUDA');
          await cargarDatos();
          showToast(`Pago total de ${formatearMoneda(deudaTotal)} registrado para ${jugadorNombre}`, 'success');
          setMostrarDetalle(false);
          if (onDataChange) onDataChange();
        } catch (error) {
          showToast('Error al registrar el pago: ' + error.message, 'error');
        }
        setShowConfirmModal(false);
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'success'
    });
    setShowConfirmModal(true);
  };

  const verDetalle = (jugador) => {
    setJugadorSeleccionado(jugador);
    setMostrarDetalle(true);
  };

  const totalJugadores = jugadores.length;
  const jugadoresConDeuda = jugadores.filter(j => getDeudaPorJugador(j.id) > 0).length;
  const totalDeudaGeneral = jugadores.reduce((total, j) => total + getDeudaPorJugador(j.id), 0);

  const jugadoresFiltrados = jugadores.filter(j => {
    const nombreMatch = j.nombre.toLowerCase().includes(filtroJugador.toLowerCase());
    const deuda = getDeudaPorJugador(j.id);
    if (filtroEstado === 'con-deuda') return nombreMatch && deuda > 0;
    if (filtroEstado === 'sin-deuda') return nombreMatch && deuda === 0;
    return nombreMatch;
  });

  if (loading) {
    return (
      <div className="control-pagos">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando datos de pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="control-pagos">
      <div className="header-actions">
        <h2><i className="fas fa-dollar-sign"></i> Control de Pagos</h2>
        <div className="header-buttons">
          <button className="btn-refrescar" onClick={refrescarDatos}>
            <i className="fas fa-sync-alt"></i> Refrescar
          </button>
        </div>
      </div>

      <div className="stats-resumen">
        <div className="resumen-card">
          <i className="fas fa-users"></i>
          <div>
            <h3>{totalJugadores}</h3>
            <p>Total Jugadores</p>
          </div>
        </div>
        <div className="resumen-card warning">
          <i className="fas fa-exclamation-triangle"></i>
          <div>
            <h3>{jugadoresConDeuda}</h3>
            <p>Con Deuda</p>
          </div>
        </div>
        <div className="resumen-card primary">
          <i className="fas fa-dollar-sign"></i>
          <div>
            <h3>{formatearMoneda(totalDeudaGeneral)}</h3>
            <p>Deuda Total</p>
          </div>
        </div>
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
        <div className="filtro-estado">
          <button className={filtroEstado === 'todos' ? 'active' : ''} onClick={() => setFiltroEstado('todos')}>
            Todos
          </button>
          <button className={filtroEstado === 'con-deuda' ? 'active' : ''} onClick={() => setFiltroEstado('con-deuda')}>
            Con Deuda
          </button>
          <button className={filtroEstado === 'sin-deuda' ? 'active' : ''} onClick={() => setFiltroEstado('sin-deuda')}>
            Sin Deuda
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Posición</th>
              <th>Deuda Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jugadoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">No se encontraron jugadores</td>
              </tr>
            ) : (
              jugadoresFiltrados.map(jugador => {
                const deuda = getDeudaPorJugador(jugador.id);
                
                return (
                  <tr key={jugador.id} className={deuda > 0 ? 'con-deuda' : ''}>
                    <td className="numero">{jugador.numero_camiseta || '?'}</td>
                    <td className="jugador-nombre">
                      <strong>{jugador.nombre}</strong>
                    </td>
                    <td className="posicion">{jugador.posicion || 'Sin posición'}</td>
                    <td className={`deuda ${deuda > 0 ? 'pendiente' : 'pagado'}`}>
                      {formatearMoneda(deuda)}
                    </td>
                    <td className="estado-pago">
                      {deuda > 0 ? (
                        <span className="badge-pendiente">
                          <i className="fas fa-exclamation-circle"></i> Debe {formatearMoneda(deuda)}
                        </span>
                      ) : (
                        <span className="badge-pagado">
                          <i className="fas fa-check-circle"></i> Al día
                        </span>
                      )}
                    </td>
                    <td className="acciones">
                      <button className="btn-ver" onClick={() => verDetalle(jugador)}>
                        <i className="fas fa-eye"></i> Ver
                      </button>
                      {deuda > 0 && (
                        <button className="btn-pagar" onClick={() => handlePagarTodos(jugador.id, jugador.nombre, deuda)}>
                          <i className="fas fa-dollar-sign"></i> Pagar todo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal simplificado */}
      {mostrarDetalle && jugadorSeleccionado && (
        <div className="modal-overlay" onClick={() => setMostrarDetalle(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-user"></i> Detalle de Pagos - {jugadorSeleccionado.nombre}</h3>
              <div className="modal-actions">
                <button className="btn-crear-deuda" onClick={crearDeudaManual}>
                  <i className="fas fa-plus-circle"></i> Agregar deuda
                </button>
                <button className="close-btn" onClick={() => setMostrarDetalle(false)}>&times;</button>
              </div>
            </div>
            
            <div className="detalle-pagos">
              <div className="jugador-resumen">
                <div className="info-jugador">
                  <span className="numero">#{jugadorSeleccionado.numero_camiseta || '?'}</span>
                  <span className="nombre">{jugadorSeleccionado.nombre}</span>
                  <span className="posicion">{jugadorSeleccionado.posicion || 'Sin posición'}</span>
                </div>
                <div className="deuda-total">
                  <span>Deuda total:</span>
                  <strong className={getDeudaPorJugador(jugadorSeleccionado.id) > 0 ? 'deuda-pendiente' : 'deuda-pagada'}>
                    {formatearMoneda(getDeudaPorJugador(jugadorSeleccionado.id))}
                  </strong>
                </div>
              </div>

              <div className="seccion-pagos">
                <h4><i className="fas fa-dollar-sign"></i> Deuda Actual</h4>
                {getDeudaPorJugador(jugadorSeleccionado.id) === 0 ? (
                  <div className="no-pagos">
                    <i className="fas fa-check-circle"></i>
                    <p>✓ Jugador al día - No tiene deuda pendiente</p>
                  </div>
                ) : (
                  <div className="deuda-actual-card">
                    <div className="deuda-monto">
                      <span className="label">Monto pendiente:</span>
                      <span className="monto">{formatearMoneda(getDeudaPorJugador(jugadorSeleccionado.id))}</span>
                    </div>
                    <div className="deuda-actions">
                      <button 
                        className="btn-abonar-grande"
                        onClick={() => handleAbonar(
                          jugadorSeleccionado.id, 
                          jugadorSeleccionado.nombre, 
                          getDeudaPorJugador(jugadorSeleccionado.id)
                        )}
                      >
                        <i className="fas fa-hand-holding-usd"></i> Registrar Abono
                      </button>
                      <button 
                        className="btn-pagar-grande"
                        onClick={() => handlePagarTodos(
                          jugadorSeleccionado.id, 
                          jugadorSeleccionado.nombre, 
                          getDeudaPorJugador(jugadorSeleccionado.id)
                        )}
                      >
                        <i className="fas fa-check-circle"></i> Pagar Todo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cerrar" onClick={() => setMostrarDetalle(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modales globales */}
      {showConfirmModal && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          type={confirmConfig.type}
        />
      )}

      {showAbonoPrompt && (
        <ConfirmModal
          title="Registrar Abono"
          message={`Deuda actual: ${formatearMoneda(abonoData.deudaTotal)}\n\nIngresa el monto a abonar en el campo de texto`}
          onConfirm={procesarAbono}
          onCancel={() => setShowAbonoPrompt(false)}
          type="info"
        />
      )}

      {showDeudaPrompt && (
        <ConfirmModal
          title="Agregar Deuda Manual"
          message="Ingresa la descripción y el monto en los campos de texto que aparecerán"
          onConfirm={procesarDeudaManual}
          onCancel={() => setShowDeudaPrompt(false)}
          type="info"
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

export default ControlPagos;