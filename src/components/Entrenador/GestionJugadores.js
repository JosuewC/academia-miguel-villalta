// src/components/Entrenador/GestionJugadores.js
import React, { useState, useEffect } from 'react';
import { getJugadores, addUsuario, updateUsuario, deleteUsuario } from '../../database/db';
import { enviarCredencialesEmail } from '../../services/emailService';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './GestionJugadores.css';

function GestionJugadores({ onDataChange, showToast: propShowToast }) {
  const [jugadores, setJugadores] = useState([]);
  const [jugadoresFiltrados, setJugadoresFiltrados] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});
  const [formData, setFormData] = useState({
    identificacion: '',
    nombre: '',
    email: '',
    telefono: '',
    numero_camiseta: '',
    posicion: ''
  });

  const { toast, showToast: localShowToast, hideToast } = useToast();
  const showToast = propShowToast || localShowToast;

  const posiciones = ['Delantero', 'Mediocampista', 'Defensa', 'Portero/a'];

  useEffect(() => {
    cargarJugadores();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setJugadoresFiltrados(jugadores);
    } else {
      const filtered = jugadores.filter(j => 
        j.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.identificacion.includes(searchTerm) ||
        j.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setJugadoresFiltrados(filtered);
    }
  }, [searchTerm, jugadores]);

  const cargarJugadores = async () => {
    setLoading(true);
    try {
      const data = await getJugadores();
      setJugadores(data);
      setJugadoresFiltrados(data);
    } catch (error) {
      console.error('Error cargando jugadores:', error);
      showToast('Error al cargar jugadores', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editando) {
        await updateUsuario(editando.id, {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          numero_camiseta: formData.numero_camiseta || null,
          posicion: formData.posicion || null
        });
        showToast('Jugador actualizado correctamente', 'success');
      } else {
        const result = await addUsuario({
          identificacion: formData.identificacion,
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          numero_camiseta: formData.numero_camiseta || null,
          posicion: formData.posicion || null,
          rol: 'jugador'
        });
        
        await enviarCredencialesEmail(
          { 
            nombre: formData.nombre,
            email: formData.email,
            usuario: formData.identificacion
          }, 
          result.password
        );
        
        // Mensaje sin mostrar la contraseña
        showToast(`✅ Jugador registrado exitosamente. Las credenciales han sido enviadas a ${formData.email}`, 'success');
      }
      
      setShowForm(false);
      setEditando(null);
      setFormData({
        identificacion: '',
        nombre: '',
        email: '',
        telefono: '',
        numero_camiseta: '',
        posicion: ''
      });
      await cargarJugadores();
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = (id, nombre) => {
    setConfirmConfig({
      title: 'Eliminar Jugador',
      message: `¿Estás seguro de que deseas eliminar a ${nombre}?`,
      onConfirm: async () => {
        try {
          await deleteUsuario(id);
          await cargarJugadores();
          showToast(`${nombre} eliminado correctamente`, 'success');
          if (onDataChange) onDataChange();
          setShowConfirmModal(false);
        } catch (error) {
          showToast('Error al eliminar: ' + error.message, 'error');
          setShowConfirmModal(false);
        }
      },
      onCancel: () => setShowConfirmModal(false),
      type: 'danger'
    });
    setShowConfirmModal(true);
  };

  const handleEdit = (jugador) => {
    setEditando(jugador);
    setFormData({
      identificacion: jugador.identificacion,
      nombre: jugador.nombre,
      email: jugador.email,
      telefono: jugador.telefono || '',
      numero_camiseta: jugador.numero_camiseta || '',
      posicion: jugador.posicion || ''
    });
    setShowForm(true);
  };

  const getPosicionBadge = (posicion) => {
    if (!posicion) return 'badge-pending';
    const clases = {
      'Delantero': 'badge-delantero',
      'Mediocampista': 'badge-mediocampista',
      'Defensa': 'badge-defensa',
      'Portero/a': 'badge-portero'
    };
    return clases[posicion] || 'badge-pending';
  };

  const totalJugadores = jugadoresFiltrados.length;
  const totalDelanteros = jugadoresFiltrados.filter(j => j.posicion === 'Delantero').length;
  const totalMediocampistas = jugadoresFiltrados.filter(j => j.posicion === 'Mediocampista').length;
  const totalDefensas = jugadoresFiltrados.filter(j => j.posicion === 'Defensa').length;
  const totalPorteros = jugadoresFiltrados.filter(j => j.posicion === 'Portero/a').length;

  if (loading && jugadores.length === 0) {
    return <div className="loading-container">Cargando jugadores...</div>;
  }

  return (
    <div className="gestion-jugadores">
      <div className="header-actions">
        <h2><i className="fas fa-users"></i> Gestionar Jugadores</h2>
        <button className="btn-agregar" onClick={() => { setShowForm(true); setEditando(null); setFormData({ identificacion: '', nombre: '', email: '', telefono: '', numero_camiseta: '', posicion: '' }); }}>
          <i className="fas fa-plus"></i> <span>Nuevo Jugador</span>
        </button>
      </div>

      <div className="search-bar">
        <i className="fas fa-search"></i>
        <input 
          type="text" 
          placeholder="Buscar por nombre, cédula o email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="btn-clear-search" onClick={() => setSearchTerm('')}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      <div className="stats-resumen">
        <div className="resumen-card">
          <i className="fas fa-users"></i>
          <div>
            <h3>{totalJugadores}</h3>
            <p>Total Jugadores</p>
          </div>
        </div>
        <div className="resumen-card">
          <i className="fas fa-futbol"></i>
          <div>
            <h3>{totalDelanteros}</h3>
            <p>Delanteros</p>
          </div>
        </div>
        <div className="resumen-card">
          <i className="fas fa-chart-line"></i>
          <div>
            <h3>{totalMediocampistas}</h3>
            <p>Mediocampistas</p>
          </div>
        </div>
        <div className="resumen-card">
          <i className="fas fa-shield-alt"></i>
          <div>
            <h3>{totalDefensas}</h3>
            <p>Defensas</p>
          </div>
        </div>
        <div className="resumen-card">
          <i className="fas fa-hand-paper"></i>
          <div>
            <h3>{totalPorteros}</h3>
            <p>Porteros</p>
          </div>
        </div>
      </div>

      <div className="table-container desktop-view">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>#</th>
              <th>Posición</th>
              <th>Teléfono</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jugadoresFiltrados.map(jugador => (
              <tr key={jugador.id}>
                <td>{jugador.identificacion}</td>
                <td><strong>{jugador.nombre}</strong></td>
                <td>{jugador.email}</td>
                <td className="text-center">
                  {jugador.numero_camiseta ? (
                    <span className="badge-number">{jugador.numero_camiseta}</span>
                  ) : (
                    <span className="badge-pending">⚙️</span>
                  )}
                </td>
                <td className="text-center">
                  {jugador.posicion ? (
                    <span className={`badge-posicion ${getPosicionBadge(jugador.posicion)}`}>{jugador.posicion}</span>
                  ) : (
                    <span className="badge-pending">⚙️</span>
                  )}
                </td>
                <td>{jugador.telefono || '-'}</td>
                <td className="actions">
                  <button className="btn-edit" onClick={() => handleEdit(jugador)}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(jugador.id, jugador.nombre)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cards-container mobile-view">
        {jugadoresFiltrados.map(jugador => (
          <div key={jugador.id} className="data-card">
            <div className="card-header">
              <span className="card-name">{jugador.nombre}</span>
              <span className="card-number">#{jugador.numero_camiseta || '?'}</span>
            </div>
            <div className="card-body">
              <p><i className="fas fa-id-card"></i> <strong>Cédula:</strong> {jugador.identificacion}</p>
              <p><i className="fas fa-envelope"></i> <strong>Email:</strong> {jugador.email}</p>
              <p><i className="fas fa-chart-line"></i> <strong>Posición:</strong> {jugador.posicion || 'Sin posición'}</p>
              <p><i className="fas fa-phone"></i> <strong>Teléfono:</strong> {jugador.telefono || 'Sin teléfono'}</p>
            </div>
            <div className="card-actions">
              <button className="btn-edit-mobile" onClick={() => handleEdit(jugador)}>
                <i className="fas fa-edit"></i> Editar
              </button>
              <button className="btn-delete-mobile" onClick={() => handleDelete(jugador.id, jugador.nombre)}>
                <i className="fas fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? '✏️ Editar Jugador' : '👤 Nuevo Jugador'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label><i className="fas fa-id-card"></i> Cédula *</label>
                <input 
                  type="text" 
                  value={formData.identificacion} 
                  onChange={(e) => setFormData({...formData, identificacion: e.target.value})} 
                  required 
                  disabled={!!editando} 
                  placeholder="Ej: 12345678" 
                />
                {editando && <small>⚠️ La cédula no se puede modificar</small>}
              </div>
              
              <div className="form-field">
                <label><i className="fas fa-user"></i> Nombre Completo *</label>
                <input 
                  type="text" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  required 
                  placeholder="Nombre completo" 
                />
              </div>
              
              <div className="form-field">
                <label><i className="fas fa-envelope"></i> Email *</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                  placeholder="correo@ejemplo.com" 
                />
                <small>📧 Se enviarán las credenciales a este correo</small>
              </div>
              
              <div className="form-field">
                <label><i className="fas fa-phone"></i> Teléfono</label>
                <input 
                  type="tel" 
                  value={formData.telefono} 
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  placeholder="Opcional" 
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label><i className="fas fa-tshirt"></i> Número de Camiseta</label>
                  <input 
                    type="number" 
                    value={formData.numero_camiseta || ''} 
                    onChange={(e) => setFormData({...formData, numero_camiseta: e.target.value})} 
                    placeholder="Ej: 10" 
                  />
                </div>
                <div className="form-field">
                  <label><i className="fas fa-chart-line"></i> Posición</label>
                  <select 
                    value={formData.posicion} 
                    onChange={(e) => setFormData({...formData, posicion: e.target.value})}
                  >
                    <option value="">Seleccionar posición</option>
                    {posiciones.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="form-buttons">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : (editando ? 'Actualizar Jugador' : 'Registrar y Enviar Credenciales')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
          type={confirmConfig.type}
        />
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

export default GestionJugadores;