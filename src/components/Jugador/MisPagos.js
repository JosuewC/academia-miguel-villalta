// src/components/Jugador/MisPagos.js
import React, { useState, useEffect } from 'react';
import { getPagosPendientes, getCurrentUser } from '../../database/db';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import './MisPagos.css';

function MisPagos({ showToast: propShowToast }) {
  const [deudaTotal, setDeudaTotal] = useState(0);
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
      setUser(currentUser);
      
      if (currentUser) {
        const pagosData = await getPagosPendientes();
        const miDeuda = pagosData.find(p => p.jugador_id === currentUser.id);
        setDeudaTotal(miDeuda ? parseFloat(miDeuda.monto_total) : 0);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar tu información de pagos', 'error');
    }
    setLoading(false);
  };

  const formatearMoneda = (monto) => {
    if (monto === undefined || monto === null) return '$0.00';
    const numero = parseFloat(monto);
    if (isNaN(numero)) return '$0.00';
    return `$${numero.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="mis-pagos">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando tu información de pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-pagos">
      <div className="header-mis-pagos">
        <h2><i className="fas fa-dollar-sign"></i> Mis Pagos</h2>
        <p className="subtitle">Estado de cuenta actual</p>
      </div>

      <div className="resumen-deuda">
        <div className={`deuda-card ${deudaTotal > 0 ? 'pendiente' : 'pagado'}`}>
          <i className="fas fa-coins"></i>
          <div className="deuda-info">
            <span>Estado de cuenta</span>
            {deudaTotal > 0 ? (
              <>
                <strong className="deuda-monto">{formatearMoneda(deudaTotal)}</strong>
                <p className="deuda-mensaje">⚠️ Tienes un saldo pendiente</p>
              </>
            ) : (
              <>
                <strong className="deuda-monto-cero">$0.00</strong>
                <p className="deuda-mensaje-success">✓ Estás al día con tus pagos</p>
              </>
            )}
          </div>
        </div>
      </div>

      {deudaTotal > 0 && (
        <div className="info-adicional">
          <i className="fas fa-info-circle"></i>
          <p>Tu saldo pendiente se actualizará automáticamente cuando realices tus pagos.</p>
          <p className="contacto-info">Si tienes dudas, comunícate con el entrenador.</p>
        </div>
      )}

      {deudaTotal === 0 && (
        <div className="todo-bien">
          <i className="fas fa-check-circle"></i>
          <h3>¡Todo en orden!</h3>
          <p>No tienes pagos pendientes.</p>
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

export default MisPagos;