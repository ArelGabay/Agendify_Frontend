// src/pages/ProfilePage.tsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/profile.css";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const currentTime = new Date().toLocaleString();

  return (
    <div className="profile-container">
      <div className="profile-card">
        <img
          src={user?.profilePicture || "/default-avatar.png"}
          alt="Profile"
          className="profile-picture"
        />
        <h2 className="profile-title">
          👋 Hello{user ? `, ${user.username}` : ""}!
        </h2>
        {user && (
          <>
            <p className="profile-email">📧 {user.email}</p>
          </>
        )}
        <p className="profile-text">
          Welcome to your personal Agendify dashboard.
        </p>
        <p className="profile-timestamp">🕒 Logged in at: {currentTime}</p>
      </div>
    </div>
  );
};

export default ProfilePage;
