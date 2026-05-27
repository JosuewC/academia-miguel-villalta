import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getCurrentUser, getJugadores } from '../../database/db';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import './MiQR.css';

function MiQR({ showToast: propShowToast }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      console.log('Usuario actual del token:', currentUser);
      
      const jugadores = await getJugadores();
      console.log('Lista de jugadores:', jugadores);
      
      const jugadorCompleto = jugadores.find(j => j.id === currentUser?.id);
      
      if (jugadorCompleto) {
        console.log('Jugador encontrado en BD:', jugadorCompleto);
        setUser(jugadorCompleto);
        const qr = jugadorCompleto.qr_code || `JUGADOR_${jugadorCompleto.id}`;
        setQrValue(qr);
        console.log('✅ QR generado:', qr);
      } else if (currentUser) {
        setUser(currentUser);
        const qr = `JUGADOR_${currentUser.id}`;
        setQrValue(qr);
        console.log('⚠️ Usando datos del token, QR:', qr);
      } else {
        console.error('No se encontró usuario');
        showToast('No se encontró tu información de usuario', 'error');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar tus datos', 'error');
    }
    setLoading(false);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;
    
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const nombreUsuario = (user?.nombre || 'usuario').replace(/\s/g, '_');
        downloadLink.download = `QR_${nombreUsuario}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error al descargar QR:', error);
      showToast('Error al descargar el código QR', 'error');
    }
  };

  const copyQRValue = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('ID copiado al portapapeles', 'success');
  };

  const getNombre = () => {
    return user?.nombre || 'Jugador';
  };

  const getNumeroCamiseta = () => {
    return user?.numero_camiseta || '?';
  };

  const getPosicion = () => {
    const pos = user?.posicion || 'Sin posición';
    const posicionesMap = {
      'Delantero': 'Delantero ⚽',
      'Mediocampista': 'Mediocampista 🎯',
      'Defensa': 'Defensa 🛡️',
      'Portero/a': 'Portero 🧤'
    };
    return posicionesMap[pos] || pos;
  };

  if (loading) {
    return (
      <div className="mi-qr">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando tu código QR...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mi-qr">
        <div className="error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <p>No se pudo cargar tu información. Inicia sesión nuevamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mi-qr">
      <div className="header-mi-qr">
        <h2><i className="fas fa-qrcode"></i> Mi Código QR</h2>
        <p className="subtitle">Presenta este código al entrenador para registrar tu asistencia</p>
      </div>

      <div className="qr-container">
        <div className="qr-card">
          <div className="qr-header">
            <div className="qr-logo">
              <i className="fas fa-futbol"></i>
              <span>Academia Miguel Villalta</span>
            </div>
            <p className="qr-label">Código de identificación</p>
          </div>
          
          <div className="qr-code-wrapper">
            {qrValue && (
              <QRCodeSVG
                id="qr-code"
                value={qrValue}
                size={220}
                bgColor="#ffffff"
                fgColor="#1b5e20"
                level="H"
                includeMargin={true}
              />
            )}
          </div>
          
          <div className="qr-info">
            <div className="jugador-nombre">
              <i className="fas fa-user"></i>
              <strong>{getNombre()}</strong>
            </div>
            <div className="jugador-detalles">
              <span className="camiseta">#{getNumeroCamiseta()}</span>
              <span className="separador">•</span>
              <span className="posicion">{getPosicion()}</span>
            </div>
            <div className="qr-id-value">
              <span className="qr-id-label">ID:</span>
              <span className="qr-id-code">{qrValue}</span>
              <button className="btn-copy-id" onClick={copyQRValue} title="Copiar ID">
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="qr-buttons">
            <button className="btn-download-qr" onClick={downloadQR}>
              <i className="fas fa-download"></i> Descargar QR
            </button>
          </div>
        </div>

        <div className="qr-instructions">
          <h4><i className="fas fa-info-circle"></i> ¿Cómo usar tu código QR?</h4>
          <ol>
            <li>Guarda este código QR en tu teléfono o imprímelo</li>
            <li>Preséntalo al entrenador antes de cada entrenamiento o partido</li>
            <li>El entrenador lo escaneará para registrar tu asistencia</li>
            <li>Tu asistencia quedará verificada automáticamente</li>
          </ol>
          <div className="tips">
            <i className="fas fa-lightbulb"></i>
            <span>Tip: Puedes tomar una captura de pantalla para tenerlo siempre a mano</span>
          </div>
          <div className="tips warning">
            <i className="fas fa-shield-alt"></i>
            <span>Este QR es único e intransferible. No lo compartas con otras personas.</span>
          </div>
        </div>
      </div>

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

export default MiQR;