import React from "react";
import { Link } from "react-router-dom";
import "./AccessDenied.css";

function AccessDenied() {
  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <h2>Access Denied</h2>
        <p>Your role does not have permission to view this page.</p>
        <Link to="/" className="access-denied-link">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default AccessDenied;
