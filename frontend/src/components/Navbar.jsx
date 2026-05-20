import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from './Button';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          RASTRO<span>menu</span>
        </Link>
        
        {/* Mobile menu toggle */}
        <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop & Mobile Links */}
        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/#features" onClick={closeMenu}>Features</Link>
          <Link to="/#how-it-works" onClick={closeMenu}>How it Works</Link>
          <Link to="/#pricing" onClick={closeMenu}>Pricing</Link>
          
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
        
        {/* Overlay for mobile menu */}
        {isMenuOpen && <div className="navbar-overlay" onClick={closeMenu}></div>}
      </div>
    </nav>
  );
};

export default Navbar;
