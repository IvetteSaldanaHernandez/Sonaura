import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Callback = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('Spotify auth error:', error);
        navigate('/login');
        return;
      }

      if (code) {
        const isSpotifyConnect = localStorage.getItem('pending_spotify_connect') === 'true';
        
        try {
          if (isSpotifyConnect) {
            // Handle Spotify connection for existing user
            const jwtToken = localStorage.getItem('jwt_token');
            
            // Send code to backend to get tokens
            const response = await axios.post('http://localhost:5000/api/spotify/connect', 
              { code },
              { headers: { Authorization: `Bearer ${jwtToken}` } }
            );

            localStorage.setItem('spotify_token', response.data.access_token);
            localStorage.setItem('spotify_refresh_token', response.data.refresh_token);
            localStorage.removeItem('pending_spotify_connect');
            localStorage.setItem('spotify_connect_success', 'true');
            navigate('/profile');
            
          } else {
            // Handle initial login with Spotify
            const response = await axios.post('http://localhost:5000/api/spotify/callback', { code });
            
            localStorage.setItem('spotify_token', response.data.access_token);
            localStorage.setItem('spotify_refresh_token', response.data.refresh_token);
            localStorage.setItem('jwt_token', response.data.token);
            setIsAuthenticated(true);
            navigate('/profile');
          }
        } catch (err) {
          console.error('Callback error:', err);
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };

    handleSpotifyCallback();
  }, [navigate, setIsAuthenticated]);

  return <div>Connecting to Spotify...</div>;
};

export default Callback;