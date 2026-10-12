import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./LoginSingle.css";

function GuestLogin() {
  const navigate = useNavigate();
  const { guestLogin } = useAuth();
  const [credentials, setCredentials] = useState({
    contact_number: "",
    national_id_number: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    if (error) {
      setError("");
    }

    setCredentials((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.contact_number.trim() || !credentials.national_id_number.trim()) {
      setError("Please enter your contact number and national ID.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(apiUrl("/api/users/guest-auth/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_number: credentials.contact_number.trim(),
          national_id_number: credentials.national_id_number.trim()
        })
      });

      if (!response.ok) {
        let apiError = "Invalid guest credentials.";
        try {
          const errorData = await response.json();
          apiError = errorData.detail || errorData.message || errorData.error || apiError;
        } catch {
          // Use default error if JSON parsing fails
        }
        throw new Error(apiError);
      }

      const data = await response.json();
      
      // Store guest info in localStorage via guestLogin
      guestLogin({
        guest_code: credentials.contact_number,
        email: data.guest_info?.contact_number || credentials.contact_number,
        guest_info: {
          full_name: data.guest_info?.full_name || "Guest User",
          contact_number: data.guest_info?.contact_number || credentials.contact_number,
          purpose_of_visit: data.guest_info?.purpose_of_visit || "",
          entry_date: data.guest_info?.entry_date || null,
          exit_date: data.guest_info?.exit_date || null,
          status: data.guest_info?.status || "Active",
          accessible_properties: data.accessible_properties || [],
          permissions: data.permissions || {},
          is_guest: true
        }
      });

      // Redirect to guest dashboard
      navigate("/guest-dashboard");
    } catch (err) {
      setError(err.message || "Guest authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>Guest Access</h2>
          <p>Enter your registered information to access the system</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              id="contact_number"
              name="contact_number"
              type="text"
              value={credentials.contact_number}
              onChange={handleChange}
              placeholder="Enter your registered contact number"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="national_id_number">National ID Number</label>
            <input
              id="national_id_number"
              name="national_id_number"
              type="text"
              value={credentials.national_id_number}
              onChange={handleChange}
              placeholder="Enter your national ID number"
              required
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating..." : "Access as Guest"}
          </button>

          <button
            type="button"
            className="login-button login-button-secondary"
            onClick={() => navigate("/guest-register")}
            disabled={isSubmitting}
          >
            Register as Guest
          </button>
        </form>

        <div className="login-footer">
          <p>
            Need regular access? <a href="/login">Sign in with university account</a>
          </p>
          <p>
            Not registered? <a href="/guest-register">Register as a guest</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestLogin;
