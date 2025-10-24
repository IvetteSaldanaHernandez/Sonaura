import React, { useState } from 'react';
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
// import Signup from './components/Signup';
import Profile from './components/Profile';
import Callback from './components/Callback';

const logoPath = '/Logo.png';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <ul className="nav-links">
            {/* <li><NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>🎵 logo placeholder</NavLink></li> */}
            <li className="logo-item">
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active logo-link" : "nav-link logo-link"}>
                <img src={logoPath} alt="StudySound logo" className="logo" />
              </NavLink>
            </li>
            {!isAuthenticated ? (
              <>
                <li><NavLink to="/help" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Help</NavLink></li>
                <li><NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Log In</NavLink></li>
                {/* <li><NavLink to="/signup" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Sign Up</NavLink></li> */}
              </>
            ) : (
              <>
                <li><NavLink to="/activity" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Activity</NavLink></li>
                <li><NavLink to="/mood" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Mood</NavLink></li>
                <li><NavLink to="/workload" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Workload</NavLink></li>
                <li><NavLink to="/focus-level" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Focus Level</NavLink></li>
                <li><NavLink to="/help" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Help</NavLink></li>
                <li><NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Profile</NavLink></li>
                {/* <li><button onClick={handleLogout} className="nav-link logout">Log Out</button></li> */}
                <li><NavLink to="/" onClick={handleLogout} className={({ isActive }) => isActive ? "nav-link active logout" : "nav-link logout"}>Log Out</NavLink></li>
              </>
            )}
          </ul>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/mood" element={<Mood />} />
            <Route path="/workload" element={<Workload />} />
            <Route path="/focus-level" element={<FocusLevel />} />
            <Route path="/help" element={<Help />} />
            <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
            {/* <Route path="/signup" element={<Signup setIsAuthenticated={setIsAuthenticated} />} /> */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;