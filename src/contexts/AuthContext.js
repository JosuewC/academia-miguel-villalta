import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, logoutUser, getCurrentUser } from '../database/db';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Verificar si hay usuario al cargar
    useEffect(() => {
        const checkUser = () => {
            const user = getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = async (usuario, password) => {
        setLoading(true);
        try {
            const user = await loginUser(usuario, password);
            if (user) {
                setCurrentUser(user);
                setLoading(false);
                return { success: true, user };
            }
            setLoading(false);
            return { success: false, error: "Credenciales incorrectas" };
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        logoutUser();
        setCurrentUser(null);
    };

    const value = {
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isEntrenador: currentUser?.rol === 'entrenador',
        isJugador: currentUser?.rol === 'jugador',
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}