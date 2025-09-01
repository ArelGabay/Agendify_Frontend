import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/api-client";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import "../styles/auth.css";

const LoginPage = () => {
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      await login(username, password);
      setSuccessMessage(
        "✅ Login successful! Redirecting to your dashboard..."
      );

      // ⏳ Actually wait 2 seconds before navigating
      await new Promise((res) => setTimeout(res, 2000));
      navigate("/agendas");
    } catch {
      setError("Invalid username or password. Please try again.");
    }
  };

  const googleSignin = async (credentialResponse: CredentialResponse) => {
    const { credential } = credentialResponse;
    if (!credential) throw new Error("Google credential is missing");

    const response = await apiClient.post("/auth/google", { credential });
    return response.data;
  };

  const onGoogleLoginSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    try {
      const res = await googleSignin(credentialResponse);
      localStorage.setItem("user", JSON.stringify(res));
      setUser(res);
      setSuccessMessage(
        "✅ Google login successful! Redirecting to your dashboard..."
      );
      setError("");

      // ⏳ Real 2-second delay before redirect
      await new Promise((res) => setTimeout(res, 2000));
      navigate("/dashboard");
    } catch (err) {
      console.error("Google Signin error!", err);
      setError("Google login failed. Please try again.");
    }
  };

  const onGoogleLoginError = () => {
    setError("Google login failed. Please try again.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue to Agendify.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Username</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-full">Sign In</button>

          {successMessage && <div className="alert-success">{successMessage}</div>}
          {error && <div className="alert-danger">{error}</div>}
        </form>

        <div className="auth-divider"><span>or</span></div>
        <div className="google-wrap">
          <GoogleLogin
            onSuccess={onGoogleLoginSuccess}
            onError={onGoogleLoginError}
            theme="outline"
            size="large"
          />
        </div>

        <p className="auth-footer">
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
