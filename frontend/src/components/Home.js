import React from 'react';
import './Home.css';
import { NavLink } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home">
      <h1>"Personalized study playlists for every mood, workload, and focus level."</h1>

      <section className="about">
        <h2>About</h2>
        <p>
          This project was built to recommend playlists tailored to a user's mood, activity, workload, or focus level. Many
          students and professionals rely on music to improve concentration and productivity, but finding the right
          playlist often takes time and can disrupt workflow. This project aims to streamline that process by providing
          personalized, on-demand music recommendations that align with the user's current needs.
        </p>
      </section>
      
      <section className="how-it-works">
        <h2>How it Works</h2>
        <div className="features">
          <div className="feature">
            <span className="icon">🎧</span>
            <div>
              <strong>Activity</strong> → Uses recent listening activity to suggest playlists aligned with your typical music habits.
            </div>
          </div>
          <div className="feature">
            <span className="icon">🎶</span>
            <div>
              <strong>Mood</strong> → Select from moods like love, rage, optimism, joy, nostalgia, confident, hyper craze, sad. The app
              recommends playlists tagged or associated with those moods.
            </div>
          </div>
          <div className="feature">
            <span className="icon">⏳</span>
            <div>
              <strong>Workload</strong> → Indicate your current workload level (how many tasks you have and their difficulty). The app
              suggests playlists with appropriate length and pacing (e.g., longer, steady playlists for heavy workloads).
            </div>
          </div>
          <div className="feature">
            <span className="icon">🎯</span>
            <div>
              <strong>Focus Level</strong> → Answer questions about how long and how intensely you plan to study. The app tailors
              recommendations to match energy and concentration level (e.g., upbeat for low focus, lo-fi for high focus).
            </div>
          </div>
        </div>
      </section>
      
      <section className="get-started">
        <h2>Get Started!</h2>
        <ol>
          <li>Log In</li>
          <li>Select</li>
          {/* <p>[ Choose by Activity ] [ Choose by Mood ] [ Choose by Workload ] [ Choose by Focus Level ]</p> */}
            <NavLink to="/activity" className="select-button">Choose by Activity</NavLink>
            <NavLink to="/mood" className="select-button">Choose by Mood</NavLink>
            <NavLink to="/workload" className="select-button">Choose by Workload</NavLink>
            <NavLink to="/focus-level" className="select-button">Choose by Focus Level</NavLink>
          <li>Listen</li>
        </ol>
      </section>
    </div>
  );
};

export default Home;