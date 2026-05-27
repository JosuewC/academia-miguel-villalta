import React from 'react';
import './Footer.css';

function Footer() {
  const year = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <i className="fas fa-futbol"></i>
          <span>Academia Miguel Villalta</span>
        </div>
        
        <div className="footer-info">
          <p className="footer-motto">"Formando campeones dentro y fuera de la cancha"</p>
          <p className="footer-copyright">© {year} - Todos los derechos reservados</p>
        </div>
        
        <div className="footer-contact">
          <div className="contact-item">
            <i className="fas fa-phone-alt"></i>
            <span>+506 8641 6701</span>
          </div>
          <div className="contact-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>Tibás, San José, Costa Rica</span>
          </div>
        </div>
        
        <div className="footer-social">
          <a href="#" className="social-link" aria-label="Facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#" className="social-link" aria-label="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="#" className="social-link" aria-label="WhatsApp">
            <i className="fab fa-whatsapp"></i>
          </a>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>Sistema de Gestión Deportiva - Control de Asistencia y Pagos</p>
      </div>
    </footer>
  );
}

export default Footer;