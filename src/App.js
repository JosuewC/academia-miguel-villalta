import React from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import DashboardEntrenador from './components/Entrenador/DashboardEntrenador';
import DashboardJugador from './components/Jugador/DashboardJugador';

function AppContent() {
    const { currentUser, isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div className="loading-container">Cargando...</div>;
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    if (currentUser?.rol === 'entrenador') {
        return <DashboardEntrenador />;
    }
    
    return <DashboardJugador />;
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;