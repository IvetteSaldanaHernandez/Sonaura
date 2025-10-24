import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Callback = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    // const state = urlParams.get('state');

    if (code) {
    //   axios.get(`http://localhost:5000/api/spotify/callback?code=${code}`)
    //     .then(res => {
    //       localStorage.setItem('spotify_token', res.data.access_token);
    //       localStorage.setItem('spotify_refresh_token', res.data.refresh_token);
    //       localStorage.setItem('jwt_token', res.data.token);
    //       setIsAuthenticated(true);
    //       navigate('/profile');
    //     })
    //     .catch(err => {
    //       console.error('Callback error:', err);
    //       navigate('/login'); // Redirect to login on error
    //     });
      const isSpotifyConnect = localStorage.getItem('pending_spotify_connect') === 'true';
      const jwtToken = localStorage.getItem('jwt_token');
      const endpoint = isSpotifyConnect ? '/api/spotify/connect' : '/api/spotify/callback';

      const requestData = isSpotifyConnect ? { code, userId: jwtToken } : { code };

      axios.post(`http://localhost:5000${endpoint}`, requestData, {
        headers: isSpotifyConnect ? { Authorization: `Bearer ${jwtToken}` } : {}
      })
        .then(res => {
          localStorage.setItem('spotify_token', res.data.access_token);
          localStorage.setItem('spotify_refresh_token', res.data.refresh_token);
          if (!isSpotifyConnect) {
            localStorage.setItem('jwt_token', res.data.token);
            setIsAuthenticated(true);
          }
          localStorage.removeItem('pending_spotify_connect');
          if (isSpotifyConnect) {
            localStorage.setItem('spotify_connect_success', 'true'); // Flag for success message
          }
          navigate('/profile');
        })
        .catch(err => {
          console.error('Callback error:', err);
          navigate('/login');
        });
    }
  }, [navigate, setIsAuthenticated]);

  return <div>Loading...</div>;
};

export default Callback;