import React from "react";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

function Profile() {
  const { user, role } = useAuth();

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Profile</h2>
        <p>Manage your account details and role visibility.</p>
        <div className="profile-grid">
          <div>
            <span>Username</span>
            <strong>{user?.username || "N/A"}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email || "N/A"}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{role || "N/A"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
