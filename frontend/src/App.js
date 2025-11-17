import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';

// Import components for other pages
import Home from './components/Home';
import Activity from './components/Activity';
import Mood from './components/Mood';
import Workload from './components/Workload';
import FocusLevel from './components/FocusLevel';
import Help from './components/Help';
import Login from './components/Login';
import Profile from './components/Profile';
import Callback from './components/Callback';
import PlaylistView from './components/PlaylistView';


const logoPath = '/Logo.png';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsMobileMenuOpen(false);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          {/* Logo on the left */}
          <div className="nav-logo">
            <NavLink to="/" className="logo-link" onClick={closeMobileMenu}>
              <img src={logoPath} alt="StudySound logo" className="logo" />
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <ul className="nav-links">
              {!isAuthenticated ? (
                <>
                  <li><NavLink to="/help" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Help</NavLink></li>
                  <li><NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Log In</NavLink></li>
                </>
              ) : (
                <>
                  <li><NavLink to="/activity" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Activity</NavLink></li>
                  <li><NavLink to="/mood" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Mood</NavLink></li>
                  <li><NavLink to="/workload" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Workload</NavLink></li>
                  <li><NavLink to="/focus-level" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Focus Level</NavLink></li>
                  <li><NavLink to="/help" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Help</NavLink></li>
                  <li><NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Profile</NavLink></li>
                  <li><button onClick={handleLogout} className="nav-link logout-btn">Log Out</button></li>
                </>
              )}
            </ul>
          )}

          {/* Mobile Hamburger Menu */}
          {isMobile && (
            <div className="mobile-menu">
              <button 
                className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Menu Overlay */}
        {isMobile && isMobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
            <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
              <ul className="mobile-nav-links">
                {!isAuthenticated ? (
                  <>
                    <li><NavLink to="/help" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Help</NavLink></li>
                    <li><NavLink to="/login" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Log In</NavLink></li>
                  </>
                ) : (
                  <>
                    <li><NavLink to="/activity" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Activity</NavLink></li>
                    <li><NavLink to="/mood" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Mood</NavLink></li>
                    <li><NavLink to="/workload" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Workload</NavLink></li>
                    <li><NavLink to="/focus-level" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Focus Level</NavLink></li>
                    <li><NavLink to="/help" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Help</NavLink></li>
                    <li><NavLink to="/profile" className={({ isActive }) => isActive ? "mobile-nav-link active" : "mobile-nav-link"} onClick={closeMobileMenu}>Profile</NavLink></li>
                    <li><button onClick={handleLogout} className="mobile-nav-link logout-btn">Log Out</button></li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/mood" element={<Mood />} />
            <Route path="/workload" element={<Workload />} />
            <Route path="/focus-level" element={<FocusLevel />} />
            <Route path="/help" element={<Help />} />
            <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/callback" element={<Callback setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/playlist-view" element={<PlaylistView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;