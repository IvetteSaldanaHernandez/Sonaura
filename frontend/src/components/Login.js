import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // debugging
    console.log('setError type:', typeof setError);

    try {
      setError(''); // clear previous errors
      if (!username || !password) {
        setError('Please enter both username and password');
        return;
      }

      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const res = await axios.post(`http://localhost:5000${endpoint}`, { username, password });
      localStorage.setItem('jwt_token', res.data.token);
      setIsAuthenticated(true);
      navigate('/profile');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  const handleSpotifyAuth = () => {
    fetch('http://localhost:5000/api/spotify/login')
      .then(res => res.json())
      .then(data => {
        window.location.href = data.url; // Redirect to Spotify auth
      })
      .catch(err => {
        console.error('Spotify auth error:', err);
        setError('Failed to initiate Spotify login');
      });
  };

  return (
    <div className="login">
      <h2>{isSignup ? 'Sign Up' : 'Welcome back!'}</h2>
      {error && <p className="error">{error}</p>}
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
        <button type="submit">{isSignup ? 'Sign Up' : 'Log In'}</button>
      </form>
      <p>Or {isSignup ? 'sign up' : 'log in'} with Spotify:</p>
      <button onClick={handleSpotifyAuth}>Spotify {isSignup ? 'Sign Up' : 'Log In'}</button>
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