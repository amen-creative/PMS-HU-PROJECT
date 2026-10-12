import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import "./LoginSingle.css";

function GuestRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    contact_number: "",
    national_id_number: "",
    purpose_of_visit: "",
    exit_date: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    if (error) {
      setError("");
    }

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.contact_number.trim() || 
        !formData.national_id_number.trim() || !formData.purpose_of_visit.trim() || 
        !formData.exit_date) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(apiUrl("/api/guests/public-register/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          contact_number: formData.contact_number.trim(),
          national_id_number: formData.national_id_number.trim(),
          purpose_of_visit: formData.purpose_of_visit.trim(),
          exit_date: formData.exit_date
        })
      });

      if (!response.ok) {
        let apiError = "Registration failed.";
        try {
          const errorData = await response.json();
          apiError = errorData.detail || errorData.message || errorData.error || apiError;
        } catch {
          // Use default error if JSON parsing fails
        }
        throw new Error(apiError);
      }

      await response.json();
      toast.success("Guest registration successful! You can now log in.");
      
      // Redirect to guest login after successful registration
      setTimeout(() => {
        navigate("/guest-login");
      }, 2000);
    } catch (err) {
      const isNetworkError = err instanceof TypeError || err.message === "Failed to fetch";
      setError(
        isNetworkError
          ? "Cannot connect to the server. Please make sure the backend is running at http://127.0.0.1:8000."
          : (err.message || "Guest registration failed. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <ToastContainer />
      <div className="login-card">
        <div className="login-header">
          <h2>Guest Registration</h2>
          <p>Register as a guest to access the property management system</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="full_name">Full Name *</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact_number">Contact Number *</label>
            <input
              id="contact_number"
              name="contact_number"
              type="text"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="Enter your contact number"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="national_id_number">National ID Number *</label>
            <input
              id="national_id_number"
              name="national_id_number"
              type="text"
              value={formData.national_id_number}
              onChange={handleChange}
              placeholder="Enter your national ID number"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="purpose_of_visit">Purpose of Visit *</label>
            <textarea
              id="purpose_of_visit"
              name="purpose_of_visit"
              value={formData.purpose_of_visit}
              onChange={handleChange}
              placeholder="Describe the purpose of your visit"
              rows="3"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="exit_date">Exit Date *</label>
            <input
              id="exit_date"
              name="exit_date"
              type="date"
              value={formData.exit_date}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button 
            type="submit" 
            className="login-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register as Guest"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already registered? <a href="/guest-login">Log in as guest</a>
          </p>
          <p>
            Have a university account? <a href="/login">Sign in with university account</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestRegistration;
