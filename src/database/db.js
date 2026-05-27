// src/database/db.js
const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

const fetchAPI = async (endpoint, options = {}) => {
    // Obtener el token del localStorage
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Agregar el token si existe
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`📡 ${options.method || 'GET'} ${API_URL}${endpoint}`);
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la petición');
        }
        
        const data = await response.json();
        console.log('📡 Datos recibidos:', data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ============ USUARIO ACTUAL ============
export const getCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const user = JSON.parse(jsonPayload);
        console.log('👤 Usuario actual:', user);
        return user;
    } catch (error) {
        console.error('Error decodificando token:', error);
        return null;
    }
};

// ============ AUTENTICACIÓN ============
export const loginUser = async (usuario, password) => {
    try {
        const result = await fetchAPI('/login', {
            method: 'POST',
            body: JSON.stringify({ usuario, password })
        });
        
        console.log('Login result:', result);
        
        if (result.token) {
            localStorage.setItem('token', result.token);
            console.log('✅ Token guardado en localStorage');
        }
        
        if (result.usuario) {
            return result.usuario;
        }
        return null;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('token');
    console.log('✅ Token eliminado');
};

// ============ JUGADORES ============
export const getJugadores = async () => {
    console.log('🔄 Obteniendo jugadores...');
    const data = await fetchAPI('/jugadores');
    
    const jugadoresFormateados = (data || []).map(jugador => ({
        id: jugador.id,
        identificacion: jugador.identificacion || jugador.identification || '',
        nombre: jugador.nombre || '',
        email: jugador.email || '',
        usuario: jugador.usuario || '',
        telefono: jugador.telefono || '',
        numero_camiseta: jugador.numero_camiseta || null,
        posicion: jugador.posicion || '',
        rol: jugador.rol || 'jugador',
        activo: jugador.activo !== false
    }));
    
    console.log('✅ Jugadores formateados:', jugadoresFormateados.length);
    return jugadoresFormateados;
};

export const addUsuario = async (usuarioData) => {
    const payload = {
        identificacion: usuarioData.identificacion,
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        telefono: usuarioData.telefono || '',
        numero_camiseta: usuarioData.numero_camiseta || null,
        posicion: usuarioData.posicion || null,
        rol: usuarioData.rol
    };
    
    console.log('📝 Creando usuario:', payload);
    
    return await fetchAPI('/jugadores', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const updateUsuario = async (id, datos) => {
    const payload = {
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono || '',
        numero_camiseta: datos.numero_camiseta || null,
        posicion: datos.posicion || null
    };
    
    console.log(`✏️ Actualizando usuario ${id}:`, payload);
    
    return await fetchAPI(`/jugadores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

export const deleteUsuario = async (id) => {
    console.log(`🗑️ Eliminando usuario ${id}`);
    
    return await fetchAPI(`/jugadores/${id}`, {
        method: 'DELETE'
    });
};

// ============ ENTRENAMIENTOS ============
export const getEntrenamientos = async () => {
    return await fetchAPI('/entrenamientos');
};

export const addEntrenamiento = async (entrenamiento) => {
    console.log('📝 Enviando entrenamiento:', entrenamiento);
    
    return await fetchAPI('/entrenamientos', {
        method: 'POST',
        body: JSON.stringify({
            fecha: entrenamiento.fecha,
            hora: entrenamiento.hora,
            lugar: entrenamiento.lugar,
            duracion: entrenamiento.duracion,
            objetivo: entrenamiento.objetivo,
            monto_pago: entrenamiento.monto_pago !== undefined ? entrenamiento.monto_pago : 0
        })
    });
};

export const updateEntrenamiento = async (id, datos) => {
    console.log(`✏️ Actualizando entrenamiento ${id}:`, datos);
    
    return await fetchAPI(`/entrenamientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            fecha: datos.fecha,
            hora: datos.hora,
            lugar: datos.lugar,
            duracion: datos.duracion,
            objetivo: datos.objetivo,
            monto_pago: datos.monto_pago !== undefined ? datos.monto_pago : 0
        })
    });
};

export const deleteEntrenamiento = async (id) => {
    return await fetchAPI(`/entrenamientos/${id}`, {
        method: 'DELETE'
    });
};

// ============ PARTIDOS ============
export const getPartidos = async () => {
    return await fetchAPI('/partidos');
};

export const addPartido = async (partido) => {
    console.log('📝 Enviando partido:', partido);
    
    return await fetchAPI('/partidos', {
        method: 'POST',
        body: JSON.stringify({
            fecha: partido.fecha,
            hora: partido.hora,
            rival: partido.rival,
            lugar: partido.lugar,
            monto_pago: partido.monto_pago !== undefined ? partido.monto_pago : 0,
            hay_buseta: partido.hay_buseta || false,
            lugar_salida: partido.lugar_salida || null,
            hora_salida: partido.hora_salida || null,
            valor_campo: partido.valor_campo || 0
        })
    });
};

export const updatePartido = async (id, datos) => {
    console.log(`✏️ Actualizando partido ${id}:`, datos);
    
    return await fetchAPI(`/partidos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            fecha: datos.fecha,
            hora: datos.hora,
            rival: datos.rival,
            lugar: datos.lugar,
            monto_pago: datos.monto_pago !== undefined ? datos.monto_pago : 0,
            hay_buseta: datos.hay_buseta || false,
            lugar_salida: datos.lugar_salida || null,
            hora_salida: datos.hora_salida || null,
            valor_campo: datos.valor_campo || 0
        })
    });
};

export const deletePartido = async (id) => {
    return await fetchAPI(`/partidos/${id}`, {
        method: 'DELETE'
    });
};

// ============ ASISTENCIA ============
export const getAsistenciaEntrenamientos = async () => {
    return await fetchAPI('/asistencia/entrenamientos');
};

export const updateAsistenciaEntrenamiento = async (entrenamientoId, jugadorId, estado, scanQR = false) => {
    return await fetchAPI('/asistencia/entrenamientos', {
        method: 'PUT',
        body: JSON.stringify({ entrenamientoId, jugadorId, estado, scanQR })
    });
};

export const toggleApuntarseEntrenamiento = async (entrenamientoId, jugadorId) => {
    const asistencia = await getAsistenciaEntrenamientos();
    const registro = asistencia.find(a => a.entrenamiento_id === entrenamientoId && a.jugador_id === jugadorId);
    const nuevoEstado = registro?.estado === 'apuntado' ? 'no_apuntado' : 'apuntado';
    return await updateAsistenciaEntrenamiento(entrenamientoId, jugadorId, nuevoEstado, false);
};

export const getAsistenciaPartidos = async () => {
    return await fetchAPI('/asistencia/partidos');
};

export const updateAsistenciaPartido = async (partidoId, jugadorId, estado, scanQR = false, campos = 0) => {
    return await fetchAPI('/asistencia/partidos', {
        method: 'PUT',
        body: JSON.stringify({ partidoId, jugadorId, estado, scanQR, campos })
    });
};

export const toggleConvocarsePartido = async (partidoId, jugadorId) => {
    const asistencia = await getAsistenciaPartidos();
    const registro = asistencia.find(a => a.partido_id === partidoId && a.jugador_id === jugadorId);
    const nuevoEstado = registro?.estado === 'convocado' ? 'no_convocado' : 'convocado';
    return await updateAsistenciaPartido(partidoId, jugadorId, nuevoEstado, false, 0);
};

// ============ PAGOS PENDIENTES - NUEVO SISTEMA SIMPLIFICADO ============

// Obtener todos los pagos pendientes (lista de jugadores con deuda)
export const getPagosPendientes = async () => {
    return await fetchAPI('/pagos-pendientes');
};

// Acumular deuda (sumar al total del jugador)
export const acumularDeuda = async (jugadorId, monto, observacion = '') => {
    console.log('💰 Acumulando deuda:', { jugadorId, monto, observacion });
    
    return await fetchAPI('/pagos-pendientes/acumular', {
        method: 'POST',
        body: JSON.stringify({
            jugador_id: jugadorId,
            monto: monto,
            observacion: observacion
        })
    });
};

// Registrar un abono
export const registrarAbono = async (jugadorId, montoAbonado, fechaAbono, observacion = '') => {
    console.log('💵 Registrando abono:', { jugadorId, montoAbonado, fechaAbono, observacion });
    
    return await fetchAPI('/pagos-pendientes/abonar', {
        method: 'POST',
        body: JSON.stringify({
            jugador_id: jugadorId,
            monto_abonado: montoAbonado,
            fecha_abono: fechaAbono,
            observacion: observacion
        })
    });
};

// Obtener historial de abonos de un jugador
export const getHistorialAbonosByJugador = async (jugadorId) => {
    console.log('📜 Obteniendo historial de abonos para jugador:', jugadorId);
    
    return await fetchAPI(`/historial-abonos/jugador/${jugadorId}`);
};

// Obtener deuda de un jugador específico
export const getDeudaByJugadorId = async (jugadorId) => {
    console.log('💰 Obteniendo deuda del jugador:', jugadorId);
    
    try {
        const data = await fetchAPI(`/pagos-pendientes/deuda/${jugadorId}`);
        return data.total_deuda || 0;
    } catch (error) {
        console.error('Error obteniendo deuda:', error);
        return 0;
    }
};

// ============ FUNCIONES LEGACY (MANTENIDAS PARA COMPATIBILIDAD) ============

// Crear pago pendiente (legacy - usar acumularDeuda en su lugar)
export const crearPagoPendiente = async (jugadorId, eventoTipo, eventoId, monto) => {
    console.log('⚠️ [DEPRECATED] Usar acumularDeuda en su lugar');
    console.log('💰 Creando pago pendiente:', { jugadorId, eventoTipo, eventoId, monto });
    
    return await fetchAPI('/pagos-pendientes', {
        method: 'POST',
        body: JSON.stringify({
            jugador_id: jugadorId,
            evento_tipo: eventoTipo,
            evento_id: eventoId,
            monto: monto
        })
    });
};

// Pagar pago pendiente (legacy - usar registrarAbono con el monto total)
export const pagarPagoPendiente = async (pagoId, metodo_pago = 'qr') => {
    console.log('⚠️ [DEPRECATED] Usar registrarAbono en su lugar');
    console.log('✅ Pagando pago pendiente ID:', pagoId);
    
    return await fetchAPI(`/pagos-pendientes/${pagoId}/pagar`, {
        method: 'PUT',
        body: JSON.stringify({ metodo_pago })
    });
};

// Obtener deuda total de un jugador (legacy)
export const getDeudaJugador = async (jugadorId) => {
    return await getDeudaByJugadorId(jugadorId);
};

// ============ QR ============
export const registrarAsistenciaQR = async (qrCode, tipoEvento, eventoId, ipScanner = '127.0.0.1') => {
    return await fetchAPI('/qr/asistencia', {
        method: 'POST',
        body: JSON.stringify({ qrCode, tipoEvento, eventoId, ipScanner })
    });
};

// ============ ESTADÍSTICAS ============
export const getEstadisticasJugador = async (jugadorId) => {
    return await fetchAPI(`/estadisticas/jugador/${jugadorId}`);
};

export const getEstadisticasEquipo = async () => {
    return await fetchAPI('/estadisticas/equipo');
};

// ============ INICIALIZACIÓN ============
export const initDB = () => {
    console.log('✅ Base de datos conectada');
    console.log('API URL:', API_URL);
};