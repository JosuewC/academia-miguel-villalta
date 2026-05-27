// src/services/emailService.js
const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export const enviarCredencialesEmail = async (datos, password) => {
    try {
        const response = await fetch(`${API_URL}/enviar-credenciales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nombre: datos.nombre,
                email: datos.email,
                usuario: datos.usuario,
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al enviar el correo');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error enviando credenciales:', error);
        throw error;
    }
};