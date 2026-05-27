// src/components/ConfirmModal.js
import React from 'react';
import './ConfirmModal.css';

function ConfirmModal({ title, message, onConfirm, onCancel, type = 'warning' }) {
  // Configuración por tipo
  const config = {
    warning: {
      icon: 'fas fa-exclamation-triangle',
      confirmText: 'Aceptar',
      confirmClass: 'warning'
    },
    danger: {
      icon: 'fas fa-times-circle',
      confirmText: 'Eliminar',
      confirmClass: 'danger'
    },
    info: {
      icon: 'fas fa-info-circle',
      confirmText: 'Entendido',
      confirmClass: 'info'
    },
    success: {
      icon: 'fas fa-check-circle',
      confirmText: 'Continuar',
      confirmClass: 'success'
    }
  };

  const currentConfig = config[type] || config.warning;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className={`confirm-modal-icon ${type}`}>
          <i className={currentConfig.icon}></i>
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-buttons">
          <button className="btn-cancel" onClick={onCancel}>
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button className={`btn-confirm ${currentConfig.confirmClass}`} onClick={onConfirm}>
            <i className="fas fa-check"></i> {currentConfig.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;