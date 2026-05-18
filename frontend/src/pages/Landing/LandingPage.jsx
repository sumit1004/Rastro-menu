import React from 'react';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import './Landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <h1>Smart Digital QR Menus for Modern Restaurants</h1>
            <p>Elevate your customer experience with beautiful, interactive digital menus. Easy to manage, zero contact, fully optimized for mobile.</p>
            <div className="hero-cta">
              <Button>Create Your Menu Free</Button>
              <Button variant="outline">View Live Demo</Button>
            </div>
          </div>
          <div className="hero-image">
            <div className="mockup-frame">
              <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Restaurant Menu App Mockup" />
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header text-center">
            <h2>How It Works</h2>
            <p>Get your digital menu up and running in minutes.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Upload Dishes</h3>
              <p>Add your menu items, photos, ingredients, and prices through our easy dashboard.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Get QR Code</h3>
              <p>We automatically generate a unique, scannable QR code for your restaurant.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Customers Scan</h3>
              <p>Diners scan the code to instantly view your beautiful, interactive menu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Placeholder */}
      <footer className="footer">
        <div className="container text-center">
          <p>&copy; {new Date().getFullYear()} RASTROmenu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
