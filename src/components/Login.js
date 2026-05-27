import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import RecuperarPassword from './RecuperarPassword';
import './Login.css';

function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(usuario, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRecuperacionExitosa = () => {
    setShowForgot(false);
    alert('✅ Contraseña cambiada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <i className="fas fa-futbol"></i>
          </div>
          <h1>Academia Miguel Villalta</h1>
          <p>Formando campeones dentro y fuera de la cancha</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <i className="fas fa-id-card"></i>
              <input
                type="text"
                placeholder="Usuario o Correo electrónico"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Iniciar Sesión'}
            </button>

            <div className="login-links">
              <button 
                type="button" 
                className="forgot-link"
                onClick={() => setShowForgot(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        ) : (
          <RecuperarPassword 
            onBack={() => setShowForgot(false)}
            onSuccess={handleRecuperacionExitosa}
          />
        )}

        <div className="login-footer">
          <p className="contacto-info">
            <i className="fas fa-phone-alt"></i> +506 8641 6701
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;