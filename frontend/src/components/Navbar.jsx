import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from './Button';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          RASTRO<span>menu</span>
        </Link>
        <div className="navbar-links">
          <Link to="/#features">Features</Link>
          <Link to="/#how-it-works">How it Works</Link>
          <Link to="/#pricing">Pricing</Link>
          
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Button variant="outline" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
