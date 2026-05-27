// src/components/RecuperarPassword.js
import React, { useState } from 'react';
import './RecuperarPassword.css';

function RecuperarPassword({ onBack, onSuccess }) {
  const [step, setStep] = useState(1); // 1: cédula, 2: código, 3: nueva contraseña
  const [identificacion, setIdentificacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/recuperar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identificacion })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('📧 Se ha enviado un código de verificación a tu correo electrónico');
        setStep(2);
      } else {
        setError(data.error || 'Error al enviar el código');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/verificar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identificacion, codigo })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Código verificado. Ahora puedes cambiar tu contraseña');
        setStep(3);
      } else {
        setError(data.error || 'Código incorrecto');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/cambiar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identificacion, codigo, nueva_password: nuevaPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Contraseña cambiada exitosamente');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setError(data.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="recuperar-container">
      <div className="recuperar-card">
        <div className="recuperar-header">
          <div className="logo-icon-small">
            <i className="fas fa-futbol"></i>
          </div>
          <h2>Recuperar Contraseña</h2>
          <p>Te ayudaremos a recuperar tu acceso</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleEnviarCodigo} className="recuperar-form">
            <div className="input-group">
              <i className="fas fa-id-card"></i>
              <input
                type="text"
                placeholder="Ingresa tu cédula o identificación"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                required
              />
            </div>
            <p className="info-text">
              <i className="fas fa-info-circle"></i>
              Enviaremos un código de verificación a tu correo electrónico registrado
            </p>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="recuperar-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Enviar Código'}
            </button>
            <button type="button" className="back-btn" onClick={onBack}>
              ← Volver al inicio de sesión
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerificarCodigo} className="recuperar-form">
            <div className="input-group">
              <i className="fas fa-key"></i>
              <input
                type="text"
                placeholder="Ingresa el código de verificación"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </div>
            <p className="info-text">
              <i className="fas fa-envelope"></i>
              Revisa tu correo electrónico (puede estar en spam)
            </p>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="recuperar-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Verificar Código'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(1)}>
              ← Volver
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCambiarPassword} className="recuperar-form">
            <div className="input-group">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <i className="fas fa-check-circle"></i>
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <button type="submit" className="recuperar-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Cambiar Contraseña'}
            </button>
            <button type="button" className="back-btn" onClick={() => setStep(2)}>
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RecuperarPassword;