import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login (replace with API call)
    if (isSignup) {
      if (username && password) {
        setIsAuthenticated(true);
        navigate('/profile');
      } else {
        alert('Please fill in all fields.');
      }
    } else {
      if (username && password) {
        setIsAuthenticated(true);
        navigate('/profile');
      } else {
        alert('Please enter both username and password.');
      }
    }
    // Add actual API authentication logic here
  };

  // const handleSpotifyLogin = () => {
  //   // Placeholder for Spotify OAuth flow
  //   alert('Spotify login feature coming soon!');
  //   // Implement Spotify API authentication here
  // };

  return (
    <div className="login">
      <h2>{isSignup ? 'Sign Up' : 'Welcome back!'}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit">Log In</button>
      </form>
      {/* <p>Or log in with Spotify: <button onClick={handleSpotifyLogin}>Spotify Login</button></p> */}
      <p>
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <button onClick={() => setIsSignup(!isSignup)} className="toggle-form">
          {isSignup ? 'Log In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};

export default Login;