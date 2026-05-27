// src/components/Entrenador/ModalPago.js
import React from 'react';
import './ModalPago.css';

function ModalPago({ jugador, evento, monto, onConfirm, onCancel, onClose }) {
  const formatearMoneda = (monto) => {
    if (monto === undefined || monto === null) return '$0.00';
    const numero = parseFloat(monto);
    if (isNaN(numero)) return '$0.00';
    return `$${numero.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="modal-pago-overlay" onClick={onClose}>
      <div className="modal-pago-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-pago-header">
          <div className="modal-pago-icon">
            <i className="fas fa-futbol"></i>
          </div>
          <h3>Confirmar Pago</h3>
          <button className="modal-pago-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-pago-body">
          <div className="info-jugador">
            <div className="info-icon">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="info-text">
              <span className="info-label">Jugador</span>
              <span className="info-value">{jugador}</span>
            </div>
          </div>
          
          <div className="info-evento">
            <div className="info-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className="info-text">
              <span className="info-label">Evento</span>
              <span className="info-value">{evento}</span>
            </div>
          </div>
          
          <div className="info-monto">
            <div className="info-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="info-text">
              <span className="info-label">Monto a pagar</span>
              <span className="info-value monto">{formatearMoneda(monto)}</span>
            </div>
          </div>
        </div>
        
        <div className="modal-pago-footer">
          <button className="btn-pago-cancelar" onClick={onCancel}>
            <i className="fas fa-times"></i> 
            <span>Aún no paga</span>
          </button>
          <button className="btn-pago-confirmar" onClick={onConfirm}>
            <i className="fas fa-check"></i> 
            <span>Sí, ya pagó</span>
          </button>
        </div>
        
        <div className="modal-pago-info">
          <i className="fas fa-info-circle"></i>
          <small>Si el jugador no paga, se acumulará automáticamente a su deuda</small>
        </div>
      </div>
    </div>
  );
}

export default ModalPago;