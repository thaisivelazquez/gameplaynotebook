import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';

export default function NavBar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="nav">
      <Link to="/" className="nav-brand">
        Playbook
      </Link>
      <div className="nav-links">
        {auth ? (
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/lineup">Lineup</NavLink>
            <NavLink to="/selector">Selector</NavLink>
            <NavLink to="/rules">Rules</NavLink>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Sign up</NavLink>
          </>
        )}
      </div>
    </div>
  );
}