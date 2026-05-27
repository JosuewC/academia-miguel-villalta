const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// ============ CONFIGURACIÓN POSTGRESQL ============
// ✅ CORREGIDO: SSL siempre activado para Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Verificar conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL en Render');
        release();
    }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Almacenamiento temporal de códigos de recuperación
const codigosRecuperacion = {};

// Verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// ============ ENVÍO DE CORREO PARA NUEVO ENTRENAMIENTO ============
app.post('/api/enviar-notificacion-entrenamiento', async (req, res) => {
    const { entrenamiento, jugadores } = req.body;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuevo Entrenamiento - Academia Miguel Villalta</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #e8f5e9; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); padding: 25px 20px; text-align: center; }
                .icono { font-size: 50px; margin-bottom: 10px; }
                .header h1 { color: white; font-size: 20px; }
                .header .slogan { color: #a5d6a7; font-size: 11px; margin-top: 5px; }
                .content { padding: 25px; }
                .bienvenida { text-align: center; margin-bottom: 20px; }
                .bienvenida h2 { color: #1b5e20; font-size: 20px; margin-bottom: 8px; }
                .card-info { background: #f1f8e9; border-radius: 12px; padding: 15px 20px; margin: 20px 0; border-left: 3px solid #2e7d32; }
                .info-item { margin: 10px 0; }
                .info-label { font-size: 11px; color: #2e7d32; text-transform: uppercase; font-weight: 600; }
                .info-valor { font-size: 16px; font-weight: 600; color: #1b5e20; margin-top: 3px; }
                .btn-iniciar { display: block; background: linear-gradient(135deg, #1b5e20, #2e7d32); color: white; text-align: center; padding: 12px; border-radius: 30px; text-decoration: none; font-weight: 600; margin-top: 20px; }
                .footer { background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0; }
                .footer p { font-size: 10px; color: #999; margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icono">⚽</div>
                    <h1>ACADEMIA DE FÚTBOL<br>MIGUEL VILLALTA</h1>
                    <div class="slogan">Formando campeones dentro y fuera de la cancha</div>
                </div>
                <div class="content">
                    <div class="bienvenida">
                        <h2>¡Nuevo Entrenamiento Agendado!</h2>
                        <p>Se ha programado un nuevo entrenamiento para el equipo.</p>
                    </div>
                    <div class="card-info">
                        <div class="info-item">
                            <div class="info-label">📅 Fecha</div>
                            <div class="info-valor">${new Date(entrenamiento.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">⏰ Hora</div>
                            <div class="info-valor">${entrenamiento.hora} hrs</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">📍 Lugar</div>
                            <div class="info-valor">${entrenamiento.lugar}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">⏱️ Duración</div>
                            <div class="info-valor">${entrenamiento.duracion}</div>
                        </div>
                        ${entrenamiento.objetivo ? `
                        <div class="info-item">
                            <div class="info-label">🎯 Objetivo</div>
                            <div class="info-valor">${entrenamiento.objetivo}</div>
                        </div>
                        ` : ''}
                        ${entrenamiento.monto_pago > 0 ? `
                        <div class="info-item">
                            <div class="info-label">💰 Monto</div>
                            <div class="info-valor">$${entrenamiento.monto_pago}</div>
                        </div>
                        ` : ''}
                    </div>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn-iniciar">VER EN LA APP</a>
                </div>
                <div class="footer">
                    <p>Academia de Fútbol Miguel Villalta</p>
                    <p>📍 Tibás, San José, Costa Rica</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        for (const jugador of jugadores) {
            if (jugador.email) {
                await transporter.sendMail({
                    from: `"Academia Miguel Villalta" <${process.env.EMAIL_USER}>`,
                    to: jugador.email,
                    subject: '⚽ Nuevo Entrenamiento Programado',
                    html: htmlContent
                });
                console.log(`✅ Correo enviado a: ${jugador.email}`);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error enviando correos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ENVÍO DE CORREO PARA NUEVO PARTIDO ============
app.post('/api/enviar-notificacion-partido', async (req, res) => {
    const { partido, jugadores } = req.body;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuevo Partido - Academia Miguel Villalta</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #e8f5e9; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); padding: 25px 20px; text-align: center; }
                .icono { font-size: 50px; margin-bottom: 10px; }
                .header h1 { color: white; font-size: 20px; }
                .header .slogan { color: #a5d6a7; font-size: 11px; margin-top: 5px; }
                .content { padding: 25px; }
                .bienvenida { text-align: center; margin-bottom: 20px; }
                .bienvenida h2 { color: #1b5e20; font-size: 20px; margin-bottom: 8px; }
                .card-info { background: #f1f8e9; border-radius: 12px; padding: 15px 20px; margin: 20px 0; border-left: 3px solid #2e7d32; }
                .info-item { margin: 10px 0; }
                .info-label { font-size: 11px; color: #2e7d32; text-transform: uppercase; font-weight: 600; }
                .info-valor { font-size: 16px; font-weight: 600; color: #1b5e20; margin-top: 3px; }
                .btn-iniciar { display: block; background: linear-gradient(135deg, #1b5e20, #2e7d32); color: white; text-align: center; padding: 12px; border-radius: 30px; text-decoration: none; font-weight: 600; margin-top: 20px; }
                .footer { background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0; }
                .footer p { font-size: 10px; color: #999; margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icono">⚽</div>
                    <h1>ACADEMIA DE FÚTBOL<br>MIGUEL VILLALTA</h1>
                    <div class="slogan">Formando campeones dentro y fuera de la cancha</div>
                </div>
                <div class="content">
                    <div class="bienvenida">
                        <h2>¡Nuevo Partido Programado!</h2>
                        <p>Se ha programado un nuevo partido para el equipo.</p>
                    </div>
                    <div class="card-info">
                        <div class="info-item">
                            <div class="info-label">📅 Fecha</div>
                            <div class="info-valor">${new Date(partido.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">⏰ Hora</div>
                            <div class="info-valor">${partido.hora} hrs</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">🏆 Rival</div>
                            <div class="info-valor">${partido.rival}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">📍 Lugar</div>
                            <div class="info-valor">${partido.lugar}</div>
                        </div>
                        ${partido.monto_pago > 0 ? `
                        <div class="info-item">
                            <div class="info-label">💰 Monto</div>
                            <div class="info-valor">$${partido.monto_pago}</div>
                        </div>
                        ` : ''}
                        ${partido.hay_buseta ? `
                        <div class="info-item">
                            <div class="info-label">🚌 Buseta</div>
                            <div class="info-valor">Sale de ${partido.lugar_salida} a las ${partido.hora_salida} hrs - $${partido.valor_campo} por campo</div>
                        </div>
                        ` : ''}
                    </div>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn-iniciar">VER EN LA APP</a>
                </div>
                <div class="footer">
                    <p>Academia de Fútbol Miguel Villalta</p>
                    <p>📍 Tibás, San José, Costa Rica</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        for (const jugador of jugadores) {
            if (jugador.email) {
                await transporter.sendMail({
                    from: `"Academia Miguel Villalta" <${process.env.EMAIL_USER}>`,
                    to: jugador.email,
                    subject: '⚽ Nuevo Partido Programado',
                    html: htmlContent
                });
                console.log(`✅ Correo enviado a: ${jugador.email}`);
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error enviando correos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ENVÍO DE CORREOS CREDENCIALES ============
app.post('/api/enviar-credenciales', async (req, res) => {
    const { nombre, email, usuario, password } = req.body;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a la Academia Miguel Villalta</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: #e8f5e9;
                    padding: 20px;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
                    padding: 25px 20px;
                    text-align: center;
                }
                .icono-futbol {
                    font-size: 60px;
                    margin-bottom: 10px;
                }
                .header h1 {
                    color: white;
                    font-size: 20px;
                    font-weight: bold;
                    letter-spacing: 1px;
                }
                .header .slogan {
                    color: #a5d6a7;
                    font-size: 11px;
                    margin-top: 5px;
                }
                .content {
                    padding: 25px;
                }
                .bienvenida {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .bienvenida h2 {
                    color: #1b5e20;
                    font-size: 20px;
                    margin-bottom: 8px;
                }
                .bienvenida p {
                    color: #555;
                    font-size: 13px;
                }
                .card-credenciales {
                    background: #f1f8e9;
                    border-radius: 12px;
                    padding: 15px 20px;
                    margin: 20px 0;
                    border-left: 3px solid #2e7d32;
                }
                .credencial-item {
                    margin: 12px 0;
                }
                .credencial-label {
                    font-size: 11px;
                    color: #2e7d32;
                    text-transform: uppercase;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                .credencial-valor {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1b5e20;
                    font-family: monospace;
                    word-break: break-all;
                    margin-top: 3px;
                }
                .btn-iniciar {
                    display: block;
                    background: linear-gradient(135deg, #1b5e20, #2e7d32);
                    color: white;
                    text-align: center;
                    padding: 12px;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    margin-top: 20px;
                }
                .info-adicional {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #e0e0e0;
                }
                .info-adicional p {
                    font-size: 11px;
                    color: #888;
                    margin: 5px 0;
                }
                .footer {
                    background: #f5f5f5;
                    padding: 15px;
                    text-align: center;
                    border-top: 1px solid #e0e0e0;
                }
                .footer p {
                    font-size: 10px;
                    color: #999;
                    margin: 3px 0;
                }
                .footer .año {
                    color: #2e7d32;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icono-futbol">⚽</div>
                    <h1>ACADEMIA DE FÚTBOL<br>MIGUEL VILLALTA</h1>
                    <div class="slogan">Formando campeones dentro y fuera de la cancha</div>
                </div>
                
                <div class="content">
                    <div class="bienvenida">
                        <h2>¡Bienvenido, ${nombre}!</h2>
                        <p>Has sido registrado exitosamente en el sistema de gestión de la academia.</p>
                    </div>
                    
                    <div class="card-credenciales">
                        <div class="credencial-item">
                            <div class="credencial-label">Usuario</div>
                            <div class="credencial-valor">${usuario}</div>
                        </div>
                        <div class="credencial-item">
                            <div class="credencial-label">Contraseña temporal</div>
                            <div class="credencial-valor">${password}</div>
                        </div>
                    </div>
                    
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn-iniciar">INICIAR SESIÓN</a>
                    
                    <div class="info-adicional">
                        <p>🔐 Recomendamos cambiar tu contraseña después del primer inicio de sesión</p>
                        <p>⚽ ¡Prepárate para la próxima temporada!</p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Academia de Fútbol Miguel Villalta</p>
                    <p>📍 Tibás, San José, Costa Rica</p>
                    <p class="año">⚽ Formando talento desde 2019 ⚽</p>
                    <p style="font-size: 9px;">Este es un mensaje automático, por favor no responder.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await transporter.sendMail({
            from: `"Academia Miguel Villalta" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '⚽ ¡Bienvenido a la Academia de Fútbol Miguel Villalta!',
            html: htmlContent
        });
        console.log('✅ Correo bienvenida enviado a:', email);
        res.json({ success: true });
    } catch (error) {
        console.error('Error enviando correo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ LOGIN ============
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
            [usuario]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        const user = result.rows[0];
        if (user.password_hash !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token, 
            usuario: { 
                id: user.id, 
                nombre: user.nombre, 
                rol: user.rol, 
                numero_camiseta: user.numero_camiseta, 
                posicion: user.posicion 
            } 
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ RECUPERACIÓN DE CONTRASEÑA ============
app.post('/api/recuperar-password', async (req, res) => {
    const { identificacion } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id, nombre, email FROM usuarios WHERE identificacion = $1 AND activo = true',
            [identificacion]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró un usuario con esa cédula' });
        }
        
        const usuario = result.rows[0];
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        codigosRecuperacion[usuario.id] = {
            codigo,
            expires: Date.now() + 15 * 60 * 1000
        };
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Recuperar Contraseña - Academia Miguel Villalta</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #e8f5e9; margin: 0; padding: 20px; }
                    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); padding: 25px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 20px; }
                    .content { padding: 30px; text-align: center; }
                    .codigo { font-size: 32px; font-weight: bold; color: #2e7d32; background: #f1f8e9; padding: 15px; border-radius: 10px; letter-spacing: 5px; margin: 20px 0; }
                    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 10px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚽ Academia Miguel Villalta</h1>
                    </div>
                    <div class="content">
                        <h2>Recuperación de Contraseña</h2>
                        <p>Hola <strong>${usuario.nombre}</strong>,</p>
                        <p>Recibimos una solicitud para recuperar tu contraseña. Usa el siguiente código:</p>
                        <div class="codigo">${codigo}</div>
                        <p>Este código expira en <strong>15 minutos</strong>.</p>
                        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
                    </div>
                    <div class="footer">
                        <p>Academia de Fútbol Miguel Villalta - Tibás, San José, Costa Rica</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await transporter.sendMail({
            from: `"Academia Miguel Villalta" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '🔐 Código de recuperación de contraseña',
            html: htmlContent
        });
        
        console.log(`✅ Código de recuperación enviado a: ${usuario.email}`);
        res.json({ success: true, message: 'Código enviado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verificar-codigo', async (req, res) => {
    const { identificacion, codigo } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id FROM usuarios WHERE identificacion = $1 AND activo = true',
            [identificacion]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const usuarioId = result.rows[0].id;
        const registro = codigosRecuperacion[usuarioId];
        
        if (!registro || registro.codigo !== codigo) {
            return res.status(400).json({ error: 'Código incorrecto' });
        }
        
        if (Date.now() > registro.expires) {
            delete codigosRecuperacion[usuarioId];
            return res.status(400).json({ error: 'El código ha expirado' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/cambiar-password', async (req, res) => {
    const { identificacion, codigo, nueva_password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id FROM usuarios WHERE identificacion = $1 AND activo = true',
            [identificacion]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const usuarioId = result.rows[0].id;
        const registro = codigosRecuperacion[usuarioId];
        
        if (!registro || registro.codigo !== codigo) {
            return res.status(400).json({ error: 'Código inválido' });
        }
        
        if (Date.now() > registro.expires) {
            delete codigosRecuperacion[usuarioId];
            return res.status(400).json({ error: 'El código ha expirado' });
        }
        
        await pool.query(
            'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
            [nueva_password, usuarioId]
        );
        
        delete codigosRecuperacion[usuarioId];
        
        console.log(`✅ Contraseña actualizada para usuario ID: ${usuarioId}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ JUGADORES ============
app.get('/api/jugadores', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                id, 
                identificacion, 
                nombre, 
                email, 
                usuario, 
                telefono, 
                numero_camiseta, 
                posicion, 
                qr_code,
                rol,
                activo
             FROM usuarios 
             WHERE rol = 'jugador' AND activo = true 
             ORDER BY numero_camiseta`
        );
        
        console.log('✅ Jugadores enviados:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en GET /api/jugadores:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/jugadores', verificarToken, async (req, res) => {
    const { identificacion, nombre, email, telefono, numero_camiseta, posicion } = req.body;
    const passwordGenerada = Math.random().toString(36).substring(2, 10);
    const qrCode = `JUGADOR_${Date.now()}`;
    
    try {
        await pool.query(
            `INSERT INTO usuarios (identificacion, nombre, email, usuario, password_hash, rol, telefono, numero_camiseta, posicion, qr_code, activo, fecha_registro)
             VALUES ($1, $2, $3, $4, $5, 'jugador', $6, $7, $8, $9, true, NOW())`,
            [identificacion, nombre, email, identificacion, passwordGenerada, telefono || '', numero_camiseta || null, posicion || null, qrCode]
        );
        console.log('✅ Jugador creado:', nombre);
        res.json({ success: true, password: passwordGenerada });
    } catch (error) {
        console.error('❌ Error al crear jugador:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/jugadores/:id', verificarToken, async (req, res) => {
    const { nombre, email, telefono, numero_camiseta, posicion } = req.body;
    try {
        await pool.query(
            `UPDATE usuarios SET nombre=$1, email=$2, telefono=$3, numero_camiseta=$4, posicion=$5 WHERE id=$6 AND rol='jugador'`,
            [nombre, email, telefono || '', numero_camiseta || null, posicion || null, req.params.id]
        );
        console.log('✅ Jugador actualizado:', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al actualizar jugador:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/jugadores/:id', verificarToken, async (req, res) => {
    try {
        await pool.query(`DELETE FROM usuarios WHERE id=$1 AND rol='jugador'`, [req.params.id]);
        console.log('✅ Jugador eliminado físicamente:', req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al eliminar jugador:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ENTRENAMIENTOS ============
app.get('/api/entrenamientos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM entrenamientos ORDER BY fecha DESC`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/entrenamientos', verificarToken, async (req, res) => {
    const { fecha, hora, lugar, duracion, objetivo, monto_pago } = req.body;
    const monto = (monto_pago === '' || monto_pago === null || monto_pago === undefined) ? 0 : parseFloat(monto_pago);
    
    try {
        const result = await pool.query(
            `INSERT INTO entrenamientos (fecha, hora, lugar, duracion, objetivo, monto_pago)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [fecha, hora, lugar, duracion, objetivo, monto]
        );
        const nuevoId = result.rows[0].id;
        
        // ✅ COMENTADO - La función no existe en Render
        // if (monto > 0) {
        //     await pool.query(`SELECT sp_generar_pagos_entrenamiento($1)`, [nuevoId]);
        // }
        
        res.json({ success: true, id: nuevoId });
    } catch (error) {
        console.error('Error al crear entrenamiento:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/entrenamientos/:id', verificarToken, async (req, res) => {
    const { fecha, hora, lugar, duracion, objetivo, monto_pago } = req.body;
    const monto = (monto_pago === '' || monto_pago === null || monto_pago === undefined) ? 0 : parseFloat(monto_pago);
    
    try {
        await pool.query(
            `UPDATE entrenamientos SET fecha=$1, hora=$2, lugar=$3, duracion=$4, objetivo=$5, monto_pago=$6 WHERE id=$7`,
            [fecha, hora, lugar, duracion, objetivo, monto, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/entrenamientos/:id', verificarToken, async (req, res) => {
    try {
        await pool.query(`DELETE FROM entrenamientos WHERE id=$1`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PARTIDOS ============
app.get('/api/partidos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM partidos ORDER BY fecha DESC`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/partidos', verificarToken, async (req, res) => {
    const { fecha, hora, rival, lugar, monto_pago, hay_buseta, lugar_salida, hora_salida, valor_campo } = req.body;
    
    const monto = (monto_pago === '' || monto_pago === null || monto_pago === undefined) ? 0 : parseFloat(monto_pago);
    const valorCampo = (valor_campo === '' || valor_campo === null || valor_campo === undefined) ? 0 : parseFloat(valor_campo);
    const hayBuseta = hay_buseta === true || hay_buseta === 'true';
    
    try {
        const result = await pool.query(
            `INSERT INTO partidos (fecha, hora, rival, lugar, monto_pago, hay_buseta, lugar_salida, hora_salida, valor_campo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [fecha, hora, rival, lugar, monto, hayBuseta, lugar_salida || null, hora_salida || null, valorCampo]
        );
        const nuevoId = result.rows[0].id;
        
        // ✅ COMENTADO - La función no existe en Render
        // if (monto > 0) {
        //     await pool.query(`SELECT sp_generar_pagos_partido($1)`, [nuevoId]);
        // }
        
        res.json({ success: true, id: nuevoId });
    } catch (error) {
        console.error('Error al crear partido:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/partidos/:id', verificarToken, async (req, res) => {
    const { fecha, hora, rival, lugar, monto_pago, hay_buseta, lugar_salida, hora_salida, valor_campo } = req.body;
    
    const monto = (monto_pago === '' || monto_pago === null || monto_pago === undefined) ? 0 : parseFloat(monto_pago);
    const valorCampo = (valor_campo === '' || valor_campo === null || valor_campo === undefined) ? 0 : parseFloat(valor_campo);
    const hayBuseta = hay_buseta === true || hay_buseta === 'true';
    
    try {
        await pool.query(
            `UPDATE partidos 
             SET fecha=$1, hora=$2, rival=$3, lugar=$4, monto_pago=$5, hay_buseta=$6, lugar_salida=$7, hora_salida=$8, valor_campo=$9
             WHERE id=$10`,
            [fecha, hora, rival, lugar, monto, hayBuseta, lugar_salida || null, hora_salida || null, valorCampo, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar partido:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/partidos/:id', verificarToken, async (req, res) => {
    try {
        await pool.query(`DELETE FROM partidos WHERE id=$1`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ASISTENCIA ============
app.get('/api/asistencia/entrenamientos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM asistencia_entrenamientos`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/asistencia/entrenamientos', verificarToken, async (req, res) => {
    const { entrenamientoId, jugadorId, estado, scanQR } = req.body;
    
    console.log('📝 Actualizando asistencia entrenamiento:', { entrenamientoId, jugadorId, estado, scanQR });
    
    try {
        if (scanQR === true) {
            await pool.query(
                `INSERT INTO asistencia_entrenamientos (entrenamiento_id, jugador_id, estado, scan_qr, fecha_scan)
                 VALUES ($1, $2, $3, true, NOW())
                 ON CONFLICT (entrenamiento_id, jugador_id)
                 DO UPDATE SET 
                    estado = EXCLUDED.estado,
                    scan_qr = true,
                    fecha_scan = NOW()`,
                [entrenamientoId, jugadorId, estado]
            );
            console.log('✅ Asistencia registrada por QR');
        } else {
            await pool.query(
                `INSERT INTO asistencia_entrenamientos (entrenamiento_id, jugador_id, estado, scan_qr)
                 VALUES ($1, $2, $3, false)
                 ON CONFLICT (entrenamiento_id, jugador_id)
                 DO UPDATE SET estado = EXCLUDED.estado`,
                [entrenamientoId, jugadorId, estado]
            );
            console.log('✅ Asistencia registrada manualmente');
        }
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error actualizando asistencia:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/asistencia/partidos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM asistencia_partidos`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/asistencia/partidos', verificarToken, async (req, res) => {
    const { partidoId, jugadorId, estado, scanQR, campos } = req.body;
    
    console.log('📝 Actualizando asistencia partido:', { partidoId, jugadorId, estado, scanQR, campos });
    
    try {
        if (scanQR === true) {
            await pool.query(
                `INSERT INTO asistencia_partidos (partido_id, jugador_id, estado, campos, scan_qr, fecha_scan)
                 VALUES ($1, $2, $3, $4, true, NOW())
                 ON CONFLICT (partido_id, jugador_id)
                 DO UPDATE SET 
                    estado = EXCLUDED.estado,
                    campos = EXCLUDED.campos,
                    scan_qr = true,
                    fecha_scan = NOW()`,
                [partidoId, jugadorId, estado, campos || 0]
            );
            console.log('✅ Asistencia a partido registrada por QR');
        } else {
            await pool.query(
                `INSERT INTO asistencia_partidos (partido_id, jugador_id, estado, campos, scan_qr)
                 VALUES ($1, $2, $3, $4, false)
                 ON CONFLICT (partido_id, jugador_id)
                 DO UPDATE SET estado = EXCLUDED.estado, campos = EXCLUDED.campos`,
                [partidoId, jugadorId, estado, campos || 0]
            );
            console.log('✅ Asistencia a partido registrada manualmente');
        }
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error actualizando asistencia partido:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PAGOS PENDIENTES ============
app.get('/api/pagos-pendientes', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                pp.*,
                u.nombre as jugador_nombre,
                u.numero_camiseta as jugador_numero
            FROM pagos_pendientes pp
            JOIN usuarios u ON pp.jugador_id = u.id
            WHERE pp.monto_total > 0
            ORDER BY pp.monto_total DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo pagos pendientes:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pagos-pendientes/acumular', verificarToken, async (req, res) => {
    const { jugador_id, monto, observacion } = req.body;
    
    const montoValidado = parseFloat(monto);
    if (isNaN(montoValidado) || montoValidado <= 0) {
        return res.status(400).json({ error: 'Monto inválido' });
    }
    
    try {
        const existe = await pool.query(
            `SELECT id, monto_total FROM pagos_pendientes WHERE jugador_id = $1`,
            [jugador_id]
        );
        
        let nuevoMonto;
        if (existe.rows.length === 0) {
            nuevoMonto = montoValidado;
            await pool.query(
                `INSERT INTO pagos_pendientes (jugador_id, monto_total, fecha_actualizacion)
                 VALUES ($1, $2, NOW())`,
                [jugador_id, nuevoMonto]
            );
        } else {
            nuevoMonto = parseFloat(existe.rows[0].monto_total) + montoValidado;
            await pool.query(
                `UPDATE pagos_pendientes 
                 SET monto_total = $1, fecha_actualizacion = NOW() 
                 WHERE jugador_id = $2`,
                [nuevoMonto, jugador_id]
            );
        }
        
        await pool.query(
            `INSERT INTO historial_abonos (jugador_id, monto_abonado, monto_restante, fecha_abono, hora_abono, metodo, observacion)
             VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIME, 'acumulacion', $4)`,
            [jugador_id, montoValidado, nuevoMonto, observacion || 'Acumulación de deuda']
        );
        
        console.log(`💰 Deuda acumulada para jugador ${jugador_id}: $${nuevoMonto}`);
        res.json({ success: true, total: nuevoMonto });
    } catch (error) {
        console.error('Error acumulando deuda:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pagos-pendientes/abonar', verificarToken, async (req, res) => {
    const { jugador_id, monto_abonado, fecha_abono, observacion } = req.body;
    
    const montoValidado = parseFloat(monto_abonado);
    if (isNaN(montoValidado) || montoValidado <= 0) {
        return res.status(400).json({ error: 'Monto inválido' });
    }
    
    try {
        const deuda = await pool.query(
            `SELECT id, monto_total FROM pagos_pendientes WHERE jugador_id = $1`,
            [jugador_id]
        );
        
        if (deuda.rows.length === 0 || deuda.rows[0].monto_total <= 0) {
            return res.status(400).json({ error: 'El jugador no tiene deuda pendiente' });
        }
        
        const montoActual = parseFloat(deuda.rows[0].monto_total);
        let nuevoMonto = montoActual - montoValidado;
        if (nuevoMonto < 0) nuevoMonto = 0;
        
        await pool.query(
            `INSERT INTO historial_abonos (jugador_id, monto_abonado, monto_restante, fecha_abono, hora_abono, metodo, observacion)
             VALUES ($1, $2, $3, $4, CURRENT_TIME, 'manual', $5)`,
            [jugador_id, montoValidado, nuevoMonto, fecha_abono || new Date().toISOString().split('T')[0], observacion || null]
        );
        
        if (nuevoMonto <= 0) {
            await pool.query(`DELETE FROM pagos_pendientes WHERE jugador_id = $1`, [jugador_id]);
            console.log(`✅ Deuda liquidada para jugador ${jugador_id}`);
        } else {
            await pool.query(
                `UPDATE pagos_pendientes SET monto_total = $1, fecha_actualizacion = NOW() WHERE jugador_id = $2`,
                [nuevoMonto, jugador_id]
            );
        }
        
        console.log(`✅ Abono de $${montoValidado} registrado. Saldo restante: $${nuevoMonto}`);
        res.json({ success: true, saldo_restante: nuevoMonto });
    } catch (error) {
        console.error('Error registrando abono:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/historial-abonos/jugador/:jugadorId', verificarToken, async (req, res) => {
    const { jugadorId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM historial_abonos 
             WHERE jugador_id = $1 
             ORDER BY fecha_abono DESC, hora_abono DESC`,
            [jugadorId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pagos-pendientes/deuda/:jugadorId', verificarToken, async (req, res) => {
    const { jugadorId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT COALESCE(monto_total, 0) as total_deuda 
             FROM pagos_pendientes 
             WHERE jugador_id = $1`,
            [jugadorId]
        );
        res.json({ total_deuda: parseFloat(result.rows[0]?.total_deuda || 0) });
    } catch (error) {
        console.error('Error obteniendo deuda:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/historial-abonos/todos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ha.*, u.nombre as jugador_nombre
            FROM historial_abonos ha
            JOIN usuarios u ON ha.jugador_id = u.id
            ORDER BY ha.fecha_abono DESC, ha.hora_abono DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ QR ============
app.post('/api/qr/asistencia', verificarToken, async (req, res) => {
    const { qrCode, tipoEvento, eventoId, ipScanner } = req.body;
    try {
        const result = await pool.query(
            `SELECT * FROM sp_registrar_asistencia_qr($1, $2, $3, $4)`,
            [qrCode, tipoEvento, eventoId, ipScanner]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en QR:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ESTADÍSTICAS ============
app.get('/api/estadisticas/equipo', verificarToken, async (req, res) => {
    try {
        // ✅ CORREGIDO: Consulta directa sin usar función que no existe
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios WHERE rol = 'jugador' AND activo = true) as total_jugadores,
                (SELECT COALESCE(AVG(CASE WHEN estado = 'asistio' THEN 1 ELSE 0 END), 0) * 100 
                 FROM asistencia_entrenamientos) as promedio_asistencia,
                (SELECT COALESCE(SUM(monto_abonado), 0) FROM historial_abonos WHERE metodo != 'acumulacion') as total_recaudado,
                (SELECT COALESCE(SUM(monto_total), 0) FROM pagos_pendientes) as total_pendiente
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en estadísticas equipo:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/estadisticas/jugador/:id', verificarToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM asistencia_entrenamientos WHERE jugador_id=$1 AND estado='asistio') AS entrenamientos_asistidos,
                (SELECT COUNT(*) FROM asistencia_partidos WHERE jugador_id=$1 AND estado='jugo') AS partidos_jugados,
                (SELECT COALESCE(monto_total, 0) FROM pagos_pendientes WHERE jugador_id=$1) AS total_deuda
        `, [req.params.id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en estadísticas jugador:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
    console.log(`✅ Conectado a base de datos en Render`);
});