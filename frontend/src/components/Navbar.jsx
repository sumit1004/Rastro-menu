import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { scrollToSection } from '../utils/scroll';
import Button from './Button';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSectionNav = (sectionId) => {
    closeMenu();

    if (location.pathname === '/') {
      scrollToSection(sectionId);
      return;
    }

    navigate(`/#${sectionId}`);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          RASTRO<span>menu</span>
        </Link>

        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <button type="button" className="navbar-link-btn" onClick={() => handleSectionNav('features')}>Features</button>
          <button type="button" className="navbar-link-btn" onClick={() => handleSectionNav('how-it-works')}>How it Works</button>
          <button type="button" className="navbar-link-btn" onClick={() => handleSectionNav('pricing')}>Pricing</button>

          {user ? (
            <>
              <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
              <Button variant="outline" onClick={() => { logout(); closeMenu(); }}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Login</Link>
              <Link to="/signup" onClick={closeMenu}>
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu}></div>}
      </div>
    </nav>
  );
};

export default Navbar;

