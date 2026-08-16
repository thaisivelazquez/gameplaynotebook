import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Lineup from './pages/Lineup.jsx';
import Selector from './pages/Selector.jsx';
import Rules from './pages/Rules.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lineup"
          element={
            <ProtectedRoute>
              <Lineup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/selector"
          element={
            <ProtectedRoute>
              <Selector />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute>
              <Rules />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}