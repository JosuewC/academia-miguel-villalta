import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { 
  getJugadores, getEntrenamientos, getPartidos,
  updateAsistenciaEntrenamiento, updateAsistenciaPartido,
  getAsistenciaEntrenamientos, getAsistenciaPartidos,
  getCurrentUser, acumularDeuda, registrarAbono, getPagosPendientes
} from '../../database/db';
import ModalPago from './ModalPago';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './EscanerQR.css';

function EscanerQR({ onDataChange, showToast: propShowToast }) {
  const [scanResult, setScanResult] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [eventoSeleccionado, setEventoSeleccionado] = useState({ tipo: 'entrenamiento', id: null });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Estados para el modal de pago
  const [showModalPago, setShowModalPago] = useState(false);
  const [pagoData, setPagoData] = useState(null);
  const [pagoResolve, setPagoResolve] = useState(null);
  
  // Estados para modales de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});

  // Toast
  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  useEffect(() => {
    cargarDatos();
    setUser(getCurrentUser());
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [jugadoresData, entrenamientosData, partidosData, pagosData] = await Promise.all([
        getJugadores(),
        getEntrenamientos(),
        getPartidos(),
        getPagosPendientes()
      ]);
      setJugadores(jugadoresData);
      setEntrenamientos(entrenamientosData);
      setPartidos(partidosData);
      setPagosPendientes(pagosData);
      console.log('✅ Datos cargados:', { 
        jugadores: jugadoresData.length, 
        entrenamientos: entrenamientosData.length,
        partidos: partidosData.length,
        pagosPendientes: pagosData.length
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      showToast('Error al cargar los datos del escáner', 'error');
    }
    setLoading(false);
  };

  const buscarJugadorPorQR = (qrText) => {
    if (!qrText || !jugadores.length) return null;
    
    console.log('🔍 Buscando jugador con QR:', qrText);
    
    let jugador = jugadores.find(j => j.qr_code === qrText);
    if (jugador) return jugador;
    
    const idNumerico = parseInt(qrText);
    if (!isNaN(idNumerico)) {
      jugador = jugadores.find(j => j.id === idNumerico);
      if (jugador) return jugador;
    }
    
    if (qrText.includes('JUGADOR_')) {
      const numero = qrText.replace('JUGADOR_', '');
      const idNum = parseInt(numero);
      if (!isNaN(idNum)) {
        jugador = jugadores.find(j => j.id === idNum);
        if (jugador) return jugador;
      }
    }
    
    jugador = jugadores.find(j => j.identificacion === qrText);
    if (jugador) return jugador;
    
    jugador = jugadores.find(j => j.usuario === qrText);
    if (jugador) return jugador;
    
    console.log('❌ No se encontró ningún jugador con:', qrText);
    return null;
  };

  const handleScan = async (result) => {
    if (result && !loading) {
      const qrText = result?.text || result;
      console.log('📷 QR escaneado:', qrText);
      setScanResult(qrText);
      await procesarQR(qrText);
      setShowScanner(false);
    }
  };

  const handleError = (err) => {
    console.error('Error de escáner:', err);
    showToast('Error al acceder a la cámara', 'error');
  };

  const preguntarPagoModal = (jugadorNombre, eventoNombre, monto) => {
    return new Promise((resolve) => {
      if (monto <= 0) {
        resolve(false);
        return;
      }
      setPagoData({ jugador: jugadorNombre, evento: eventoNombre, monto });
      setPagoResolve(() => resolve);
      setShowModalPago(true);
    });
  };

  const handlePagoConfirmado = () => {
    if (pagoResolve) {
      pagoResolve(true);
      setShowModalPago(false);
      setPagoData(null);
      setPagoResolve(null);
    }
  };

  const handlePagoCancelado = () => {
    if (pagoResolve) {
      pagoResolve(false);
      setShowModalPago(false);
      setPagoData(null);
      setPagoResolve(null);
    }
  };

  const getDeudaActual = async (jugadorId) => {
    try {
      const deuda = pagosPendientes.find(p => p.jugador_id === jugadorId);
      return deuda ? parseFloat(deuda.monto_total) : 0;
    } catch (error) {
      console.error('Error obteniendo deuda:', error);
      return 0;
    }
  };

  const mostrarMensaje = (titulo, mensaje, tipo = 'success') => {
    setConfirmConfig({
      title: titulo,
      message: mensaje,
      onConfirm: () => setShowConfirmModal(false),
      onCancel: () => setShowConfirmModal(false),
      type: tipo
    });
    setShowConfirmModal(true);
  };

  const procesarQR = async (qrText) => {
    setLoading(true);
    
    const jugador = buscarJugadorPorQR(qrText);
    
    if (!jugador) {
      mostrarMensaje('Jugador no encontrado', `Valor escaneado: "${qrText}"`, 'error');
      setLoading(false);
      return;
    }

    console.log('🎉 Jugador encontrado:', jugador.nombre, '(ID:', jugador.id, ')');

    if (!eventoSeleccionado.id) {
      mostrarMensaje('Evento no seleccionado', 'Primero selecciona un entrenamiento o partido', 'warning');
      setLoading(false);
      return;
    }

    try {
      if (eventoSeleccionado.tipo === 'entrenamiento') {
        const entrenamiento = entrenamientos.find(e => e.id === eventoSeleccionado.id);
        
        if (!entrenamiento) {
          mostrarMensaje('Error', 'Entrenamiento no encontrado', 'error');
          setLoading(false);
          return;
        }

        const montoEvento = entrenamiento.monto_pago || 0;
        const eventoNombre = `Entrenamiento del ${new Date(entrenamiento.fecha).toLocaleDateString('es-ES')}`;

        const asistencia = await getAsistenciaEntrenamientos();
        const registro = asistencia.find(a => 
          a.entrenamiento_id === eventoSeleccionado.id && 
          a.jugador_id === jugador.id
        );

        if (!registro || registro.estado !== 'apuntado') {
          mostrarMensaje('No apuntado', `${jugador.nombre} no está apuntado para este entrenamiento`, 'warning');
          setLoading(false);
          return;
        }

        if (registro.estado === 'asistio') {
          mostrarMensaje('Asistencia ya registrada', `${jugador.nombre} ya registró su asistencia a este entrenamiento`, 'info');
          setLoading(false);
          return;
        }

        let pagoRealizado = false;
        if (montoEvento > 0) {
          const deudaActual = await getDeudaActual(jugador.id);
          
          if (deudaActual > 0) {
            const quierePagar = await preguntarPagoModal(
              jugador.nombre, 
              `${eventoNombre} (Tiene deuda pendiente de $${deudaActual})`, 
              montoEvento
            );
            
            if (quierePagar) {
              const fechaAbono = new Date().toISOString().split('T')[0];
              await registrarAbono(jugador.id, montoEvento, fechaAbono, `Pago de ${eventoNombre} por QR`);
              pagoRealizado = true;
              console.log(`✅ Abono de $${montoEvento} registrado para ${jugador.nombre}`);
            } else {
              await acumularDeuda(jugador.id, montoEvento, `No pagó: ${eventoNombre}`);
              console.log(`⚠️ Deuda acumulada para ${jugador.nombre} - $${montoEvento}`);
            }
          } else {
            pagoRealizado = await preguntarPagoModal(jugador.nombre, eventoNombre, montoEvento);
            
            if (pagoRealizado) {
              const fechaAbono = new Date().toISOString().split('T')[0];
              await registrarAbono(jugador.id, montoEvento, fechaAbono, `Pago de ${eventoNombre} por QR`);
              console.log(`✅ Pago de $${montoEvento} registrado para ${jugador.nombre}`);
            } else {
              await acumularDeuda(jugador.id, montoEvento, `No pagó: ${eventoNombre}`);
              console.log(`⚠️ Deuda acumulada para ${jugador.nombre} - $${montoEvento}`);
            }
          }
        }

        await updateAsistenciaEntrenamiento(eventoSeleccionado.id, jugador.id, 'asistio', true);
        
        let mensaje = `${jugador.nombre} registró su asistencia al entrenamiento`;
        if (montoEvento > 0) {
          const deudaFinal = await getDeudaActual(jugador.id);
          if (pagoRealizado) {
            mensaje += `\n💰 Pago de $${montoEvento} registrado correctamente.`;
            if (deudaFinal > 0) {
              mensaje += `\n💰 Deuda restante: $${deudaFinal}`;
            }
          } else {
            mensaje += `\n⚠️ Se ha acumulado $${montoEvento} a su deuda.`;
            mensaje += `\n💰 Deuda total actual: $${deudaFinal}`;
          }
        }
        mostrarMensaje('✅ Asistencia Registrada', mensaje, 'success');
        
      } else if (eventoSeleccionado.tipo === 'partido') {
        const partido = partidos.find(p => p.id === eventoSeleccionado.id);
        
        if (!partido) {
          mostrarMensaje('Error', 'Partido no encontrado', 'error');
          setLoading(false);
          return;
        }

        const montoEvento = partido.monto_pago || 0;
        const eventoNombre = `Partido vs ${partido.rival} - ${new Date(partido.fecha).toLocaleDateString('es-ES')}`;

        const asistencia = await getAsistenciaPartidos();
        const registro = asistencia.find(a => 
          a.partido_id === eventoSeleccionado.id && 
          a.jugador_id === jugador.id
        );

        if (!registro || registro.estado !== 'convocado') {
          mostrarMensaje('No convocado', `${jugador.nombre} no está convocado para este partido`, 'warning');
          setLoading(false);
          return;
        }

        if (registro.estado === 'jugo') {
          mostrarMensaje('Asistencia ya registrada', `${jugador.nombre} ya registró su asistencia a este partido`, 'info');
          setLoading(false);
          return;
        }

        let mensajePagos = '';
        
        if (montoEvento > 0) {
          const deudaActual = await getDeudaActual(jugador.id);
          
          if (deudaActual > 0) {
            const quierePagar = await preguntarPagoModal(
              jugador.nombre, 
              `${eventoNombre} (Tiene deuda pendiente de $${deudaActual})`, 
              montoEvento
            );
            
            if (quierePagar) {
              const fechaAbono = new Date().toISOString().split('T')[0];
              await registrarAbono(jugador.id, montoEvento, fechaAbono, `Pago de ${eventoNombre} por QR`);
              mensajePagos += `💰 Pago de $${montoEvento} registrado.`;
            } else {
              await acumularDeuda(jugador.id, montoEvento, `No pagó: ${eventoNombre}`);
              mensajePagos += `⚠️ Se acumuló $${montoEvento} a su deuda.`;
            }
          } else {
            const pagoRealizado = await preguntarPagoModal(jugador.nombre, eventoNombre, montoEvento);
            
            if (pagoRealizado) {
              const fechaAbono = new Date().toISOString().split('T')[0];
              await registrarAbono(jugador.id, montoEvento, fechaAbono, `Pago de ${eventoNombre} por QR`);
              mensajePagos += `💰 Pago de $${montoEvento} registrado.`;
            } else {
              await acumularDeuda(jugador.id, montoEvento, `No pagó: ${eventoNombre}`);
              mensajePagos += `⚠️ Se acumuló $${montoEvento} a su deuda.`;
            }
          }
        }

        if (partido.hay_buseta && registro.campos > 0) {
          const totalBuseta = registro.campos * (partido.valor_campo || 0);
          if (totalBuseta > 0) {
            const pagoBuseta = await preguntarPagoModal(jugador.nombre, `Buseta para ${eventoNombre}`, totalBuseta);
            if (pagoBuseta) {
              const fechaAbono = new Date().toISOString().split('T')[0];
              await registrarAbono(jugador.id, totalBuseta, fechaAbono, `Pago de buseta para ${eventoNombre} por QR`);
              mensajePagos += `\n🚌 Pago de buseta ($${totalBuseta}) registrado.`;
            } else {
              await acumularDeuda(jugador.id, totalBuseta, `No pagó: Buseta para ${eventoNombre}`);
              mensajePagos += `\n⚠️ Se acumuló $${totalBuseta} por buseta a su deuda.`;
            }
          }
        }

        await updateAsistenciaPartido(eventoSeleccionado.id, jugador.id, 'jugo', true, registro.campos || 0);
        
        const deudaFinal = await getDeudaActual(jugador.id);
        let mensaje = `${jugador.nombre} registró su asistencia al partido`;
        if (mensajePagos) {
          mensaje += `\n${mensajePagos}`;
        }
        if (deudaFinal > 0) {
          mensaje += `\n💰 Deuda total actual: $${deudaFinal}`;
        }
        mostrarMensaje('✅ Asistencia Registrada', mensaje, 'success');
      }

      await cargarDatos();
      if (onDataChange) onDataChange();
      
    } catch (error) {
      console.error('Error procesando QR:', error);
      mostrarMensaje('Error', 'Error al procesar el QR: ' + error.message, 'error');
    }
    
    setLoading(false);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no asignada';
    try {
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toLocaleDateString('es-ES');
      }
      return fecha;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const eventosDisponibles = () => {
    const eventos = [];
    
    entrenamientos.forEach(e => {
      eventos.push({ 
        id: e.id, 
        tipo: 'entrenamiento', 
        nombre: `Entrenamiento - ${formatearFecha(e.fecha)}`, 
        lugar: e.lugar, 
        fecha: e.fecha,
        monto: e.monto_pago
      });
    });
    
    partidos.forEach(p => {
      eventos.push({ 
        id: p.id, 
        tipo: 'partido', 
        nombre: `Partido vs ${p.rival} - ${formatearFecha(p.fecha)}`, 
        lugar: p.lugar, 
        fecha: p.fecha,
        monto: p.monto_pago,
        hay_buseta: p.hay_buseta
      });
    });
    
    return eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  const handleEventoChange = (e) => {
    if (!e.target.value) {
      setEventoSeleccionado({ tipo: 'entrenamiento', id: null });
      return;
    }
    const [tipo, id] = e.target.value.split('_');
    setEventoSeleccionado({ tipo, id: parseInt(id) });
  };

  if (loading && jugadores.length === 0) {
    return (
      <div className="escaner-qr">
        <div className="loading-container">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="escaner-qr">
      <div className="header-actions">
        <h2><i className="fas fa-qrcode"></i> Escáner QR - Control de Asistencia</h2>
      </div>

      <div className="escaner-container">
        <div className="selector-evento">
          <label><i className="fas fa-calendar-alt"></i> Seleccionar evento:</label>
          <select onChange={handleEventoChange} value={eventoSeleccionado.id ? `${eventoSeleccionado.tipo}_${eventoSeleccionado.id}` : ''}>
            <option value="">-- Seleccionar entrenamiento o partido --</option>
            {eventosDisponibles().map(evento => (
              <option key={`${evento.tipo}_${evento.id}`} value={`${evento.tipo}_${evento.id}`}>
                {evento.nombre} - {evento.lugar} {evento.monto > 0 ? `($${evento.monto})` : ''}
              </option>
            ))}
          </select>
        </div>

        {eventoSeleccionado.id && (
          <div className="evento-info">
            <i className="fas fa-info-circle"></i>
            <span>
              Escaneando asistencia para: <strong>
                {eventoSeleccionado.tipo === 'entrenamiento' 
                  ? `Entrenamiento del ${formatearFecha(entrenamientos.find(e => e.id === eventoSeleccionado.id)?.fecha)}`
                  : `Partido vs ${partidos.find(p => p.id === eventoSeleccionado.id)?.rival}`}
              </strong>
            </span>
          </div>
        )}

        <div className="scanner-area">
          {!showScanner ? (
            <div className="scanner-placeholder">
              <i className="fas fa-camera"></i>
              <p>Haz clic en "Iniciar Escáner" para comenzar</p>
              <button 
                className="btn-iniciar-scanner" 
                onClick={() => setShowScanner(true)}
                disabled={!eventoSeleccionado.id}
              >
                <i className="fas fa-play"></i> Iniciar Escáner
              </button>
              {!eventoSeleccionado.id && (
                <p className="warning">⚠️ Primero selecciona un evento</p>
              )}
            </div>
          ) : (
            <div className="scanner-active">
              <div className="scanner-header">
                <span><i className="fas fa-qrcode"></i> Escaneando...</span>
                <button className="btn-cerrar-scanner" onClick={() => setShowScanner(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="qr-reader-container">
                <QrReader
                  onResult={handleScan}
                  constraints={{ facingMode: 'environment' }}
                  containerStyle={{ width: '100%' }}
                  videoStyle={{ width: '100%', borderRadius: '1rem' }}
                />
              </div>
              <p className="instrucciones">
                <i className="fas fa-mobile-alt"></i> Coloca el código QR del jugador frente a la cámara
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de pago personalizado */}
      {showModalPago && pagoData && (
        <ModalPago
          jugador={pagoData.jugador}
          evento={pagoData.evento}
          monto={pagoData.monto}
          onConfirm={handlePagoConfirmado}
          onCancel={handlePagoCancelado}
          onClose={() => setShowModalPago(false)}
        />
      )}

      {/* Modal de confirmación global */}
      {showConfirmModal && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          type={confirmConfig.type}
        />
      )}

      {/* Toast para notificaciones */}
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

export default EscanerQR;