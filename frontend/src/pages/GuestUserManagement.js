import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./Properties.css";

const accessLevelOptions = [
  { value: "VIEW_ONLY", label: "View Only" },
  { value: "LIMITED_ACCESS", label: "Limited Access" },
  { value: "FULL_ACCESS", label: "Full Access" }
];

function GuestUserManagement() {
  const { accessToken } = useAuth();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    organization: "",
    purpose: "",
    access_level: "VIEW_ONLY",
    event_name: "",
    event_start_date: "",
    event_end_date: "",
    property_ids: []
  });

  useEffect(() => {
    fetchGuests();
  }, [accessToken]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/users/guests/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch guest users');
      }

      const data = await response.json();
      setGuests(data);
    } catch (err) {
      setError(err.message || "Failed to load guest users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      setLoading(true);
      const url = editingGuest 
        ? apiUrl(`/api/users/guests/${editingGuest.id}/`)
        : apiUrl("/api/users/guests/");

      const method = editingGuest ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || (editingGuest ? 'Failed to update guest user' : 'Failed to create guest user'));
      }

      const data = await response.json();
      
      if (editingGuest) {
        setGuests(guests.map(guest => 
          guest.id === editingGuest.id ? data : guest
        ));
        setEditingGuest(null);
        setSuccessMessage("Guest user updated successfully");
      } else {
        setGuests([...guests, data]);
        setSuccessMessage("Guest user created successfully");
      }

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        organization: "",
        purpose: "",
        access_level: "VIEW_ONLY",
        event_name: "",
        event_start_date: "",
        event_end_date: "",
        property_ids: []
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone_number: guest.phone_number,
      organization: guest.organization,
      purpose: guest.purpose,
      access_level: guest.access_level,
      event_name: guest.event_name,
      event_start_date: guest.event_start_date ? guest.event_start_date.split('T')[0] : '',
      event_end_date: guest.event_end_date ? guest.event_end_date.split('T')[0] : '',
      property_ids: guest.property_ids || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (guestId) => {
    if (!window.confirm('Are you sure you want to delete this guest user?')) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/users/guests/${guestId}/`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete guest user');
      }

      setGuests(guests.filter(guest => guest.id !== guestId));
      setSuccessMessage("Guest user deleted successfully");
    } catch (err) {
      setError(err.message || "Failed to delete guest user");
    }
  };

  const isExpired = (guest) => {
    return guest.event_end_date && new Date(guest.event_end_date) < new Date();
  };

  const getStatusBadge = (guest) => {
    if (isExpired(guest)) {
      return <span className="status-badge status-danger">Expired</span>;
    }
    if (guest.is_active) {
      return <span className="status-badge status-success">Active</span>;
    }
    return <span className="status-badge status-neutral">Inactive</span>;
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Guest User Management</h2>
            <p>Manage temporary access for university events</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(true)}
          >
            Create Guest User
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {showCreateForm && (
          <div className="form-overlay">
            <div className="form-modal">
              <h3>{editingGuest ? 'Edit Guest User' : 'Create Guest User'}</h3>
              <form className="input-grid" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Enter last name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    name="organization"
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({...formData, organization: e.target.value})}
                    placeholder="Enter organization name"
                  />
                </div>

                <div className="form-group">
                  <label>Purpose</label>
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    placeholder="Describe the purpose of visit"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Access Level</label>
                  <select
                    name="access_level"
                    value={formData.access_level}
                    onChange={(e) => setFormData({...formData, access_level: e.target.value})}
                  >
                    {accessLevelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Event Name</label>
                  <input
                    name="event_name"
                    type="text"
                    value={formData.event_name}
                    onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                    placeholder="e.g., University Conference 2024"
                  />
                </div>

                <div className="form-group">
                  <label>Event Start Date</label>
                  <input
                    name="event_start_date"
                    type="date"
                    value={formData.event_start_date}
                    onChange={(e) => setFormData({...formData, event_start_date: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Event End Date</label>
                  <input
                    name="event_end_date"
                    type="date"
                    value={formData.event_end_date}
                    onChange={(e) => setFormData({...formData, event_end_date: e.target.value})}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingGuest(null);
                      setFormData({
                        first_name: "",
                        last_name: "",
                        email: "",
                        phone_number: "",
                        organization: "",
                        purpose: "",
                        access_level: "VIEW_ONLY",
                        event_name: "",
                        event_start_date: "",
                        event_end_date: "",
                        property_ids: []
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingGuest ? 'Update Guest' : 'Create Guest')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="guests-table">
          <h3>Guest Users ({guests.length})</h3>
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading guest users...</p>
            </div>
          ) : guests.length === 0 ? (
            <div className="no-results">
              <h3>No guest users found</h3>
              <p>Create your first guest user to get started.</p>
            </div>
          ) : (
            <table className="list-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Event</th>
                  <th>Access Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.map(guest => (
                  <tr key={guest.id}>
                    <td>
                      <div>
                        <strong>{guest.first_name} {guest.last_name}</strong>
                        {guest.phone_number && <small>{guest.phone_number}</small>}
                      </div>
                    </td>
                    <td>{guest.email}</td>
                    <td>{guest.organization || 'N/A'}</td>
                    <td>
                      <div>
                        <strong>{guest.event_name}</strong><br/>
                        <small>
                          {guest.event_start_date && new Date(guest.event_start_date).toLocaleDateString()} - 
                          {guest.event_end_date && new Date(guest.event_end_date).toLocaleDateString()}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`access-level-badge access-${guest.access_level.toLowerCase()}`}>
                        {guest.access_level.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{getStatusBadge(guest)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-small btn-primary" 
                          onClick={() => handleEdit(guest)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={() => handleDelete(guest.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuestUserManagement;
