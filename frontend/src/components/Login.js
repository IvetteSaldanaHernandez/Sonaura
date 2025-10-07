// src/components/Login.js
import React from 'react';

const Login = () => {
  return (
    <div>
      <h2>Log In</h2>
      <form>
        <label>Username: <input type="text" /></label>
        <label>Password: <input type="password" /></label>
        <button type="submit">Log In</button>
      </form>
      <p>Or log in with Spotify: <button>Spotify Login</button></p>
      {/* Handle form submission with API calls */}
    </div>
  );
};

export default Login;