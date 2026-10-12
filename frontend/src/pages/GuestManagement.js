import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { toast } from "../utils/toast";
import "./GuestManagement.css";

function GuestManagement() {
  const { accessToken } = useAuth();
  const [guests, setGuests] = useState([]);
  const [activeGuests, setActiveGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    contact_number: "",
    purpose_of_visit: "",
    exit_date: "",
    national_id_number: ""
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal styles
  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    content: {
      background: 'white',
      padding: '2rem',
      borderRadius: '8px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center'
    },
    buttons: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      marginTop: '1rem'
    }
  };

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/guests/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch guests');
      }

      const data = await response.json();
      setGuests(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchActiveGuests = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/guests/active/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveGuests(data);
      }
    } catch (err) {
      console.error('Failed to fetch active guests:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchGuests();
    fetchActiveGuests();
  }, [fetchGuests, fetchActiveGuests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!formData.contact_number.trim()) {
      setError("Contact number is required");
      return false;
    }
    if (!/^\d{10}$/.test(formData.contact_number.trim())) {
      setError("Contact number must be exactly 10 digits");
      return false;
    }
    if (!formData.purpose_of_visit.trim()) {
      setError("Purpose of visit is required");
      return false;
    }
    if (!formData.exit_date) {
      setError("Exit date is required");
      return false;
    }
    if (!formData.national_id_number.trim()) {
      setError("National ID number is required");
      return false;
    }

    const exitDate = new Date(formData.exit_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (exitDate <= today) {
      setError("Exit date must be in the future");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(apiUrl("/api/guests/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          contact_number: formData.contact_number.trim(),
          purpose_of_visit: formData.purpose_of_visit.trim(),
          exit_date: formData.exit_date,
          national_id_number: formData.national_id_number.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || "Failed to register guest");
      }

      const newGuest = await response.json();
      setSuccessMessage(`Guest ${newGuest.full_name} registered successfully!`);

      // Reset form
      setFormData({
        full_name: "",
        contact_number: "",
        purpose_of_visit: "",
        exit_date: "",
        national_id_number: ""
      });
      setShowCreateForm(false);

      // Refresh guest lists
      fetchGuests();
      fetchActiveGuests();

      toast.success("Guest registered successfully!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveGuest = (guestId, guestName) => {
    setConfirmMessage(`Are you sure you want to archive ${guestName}'s record?`);
    setConfirmAction(() => () => performArchive(guestId, guestName));
    setShowConfirmDialog(true);
  };

  const performArchive = async (guestId, guestName) => {
    try {
      const response = await fetch(apiUrl(`/api/guests/${guestId}/archive/`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to archive guest");
      }

      setSuccessMessage(`Guest ${guestName} archived successfully!`);
      fetchGuests();
      fetchActiveGuests();
      toast.success("Guest archived successfully!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="properties-container">
      <div className="properties-header">
        <h1>Guest Access Management</h1>
        <div className="properties-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "+ Register New Guest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button
            className="alert-close"
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="property-form-container">
          <div className="property-form">
            <h3>Register New Guest</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter guest's full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact_number">Contact Number *</label>
                  <input
                    type="tel"
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purpose_of_visit">Purpose of Visit *</label>
                  <textarea
                    id="purpose_of_visit"
                    name="purpose_of_visit"
                    value={formData.purpose_of_visit}
                    onChange={handleInputChange}
                    placeholder="Describe the purpose of the visit"
                    rows="3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exit_date">Expected Exit Date *</label>
                  <input
                    type="date"
                    id="exit_date"
                    name="exit_date"
                    value={formData.exit_date}
                    onChange={handleInputChange}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="national_id_number">National ID Number *</label>
                <input
                  type="text"
                  id="national_id_number"
                  name="national_id_number"
                  value={formData.national_id_number}
                  onChange={handleInputChange}
                  placeholder="Enter National ID number (will be encrypted)"
                  required
                />
                <small className="form-help">This information is encrypted and stored securely.</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Register Guest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="properties-content">
        <div className="properties-grid">
          <div className="property-card">
            <div className="property-card-header">
              <h3>Active Guests ({activeGuests.length})</h3>
            </div>
            <div className="property-card-content">
              {activeGuests.length === 0 ? (
                <p className="no-data">No active guests</p>
              ) : (
                <div className="guest-list">
                  {activeGuests.map(guest => (
                    <div key={guest.guest_id} className="guest-item">
                      <div className="guest-info">
                        <h4>{guest.full_name}</h4>
                        <p>Contact: {guest.contact_number}</p>
                        <p>Purpose: {guest.purpose_of_visit}</p>
                        <p>Exit Date: {formatDate(guest.exit_date)}</p>
                        <p>Days Remaining: {guest.days_remaining}</p>
                      </div>
                      <div className="guest-actions">
                        <button
                          className="btn btn-small btn-warning"
                          onClick={() => handleArchiveGuest(guest.guest_id, guest.full_name)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="property-card">
            <div className="property-card-header">
              <h3>All Guest Records ({guests.length})</h3>
            </div>
            <div className="property-card-content">
              {loading ? (
                <p>Loading guests...</p>
              ) : guests.length === 0 ? (
                <p className="no-data">No guest records found</p>
              ) : (
                <div className="guest-list">
                  {guests.map(guest => (
                    <div key={guest.guest_id} className="guest-item">
                      <div className="guest-info">
                        <h4>{guest.full_name}</h4>
                        <p>Contact: {guest.contact_number}</p>
                        <p>Purpose: {guest.purpose_of_visit}</p>
                        <p>Entry: {formatDate(guest.entry_date)}</p>
                        <p>Exit: {formatDate(guest.exit_date)}</p>
                        <p>Status: <span className={`status-${guest.status.toLowerCase()}`}>{guest.status}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" style={modalStyles.overlay}>
          <div className="modal-content" style={modalStyles.content}>
            <h4>Confirm Action</h4>
            <p>{confirmMessage}</p>
            <div style={modalStyles.buttons}>
              <button
                className="btn btn-small btn-danger"
                onClick={() => {
                  setShowConfirmDialog(false);
                  if (confirmAction) confirmAction();
                }}
              >
                Yes, Archive
              </button>
              <button
                className="btn btn-small"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestManagement;
