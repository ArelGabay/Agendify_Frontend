// src/components/Navbar.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Agendify
        </Link>

        <div className="navbar-auth">
          {user ? (
            <>
              <Link
                to="/agendas"
                className={`nav-btn ${isActive("/agendas") ? "active" : ""}`}
              >
                Agendas
              </Link>
              <Link
                to="/profile"
                className={`nav-btn ${isActive("/profile") ? "active" : ""}`}
              >
                Profile
              </Link>
              <button onClick={logout} className="nav-btn logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`nav-btn ${isActive("/login") ? "active" : ""}`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className={`nav-btn ${isActive("/register") ? "active" : ""}`}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
