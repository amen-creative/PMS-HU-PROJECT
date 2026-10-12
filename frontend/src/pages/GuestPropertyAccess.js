import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./Properties.css";

function GuestPropertyAccess() {
  const { guestInfo } = useAuth();
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formData, setFormData] = useState({
    guest_user: "",
    property: "",
    notes: ""
  });

  useEffect(() => {
    if (guestInfo?.is_guest) {
      fetchAccessRequests();
    }
  }, [guestInfo]);

  const fetchAccessRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/users/guests/property-access/"), {
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property access requests');
      }

      const data = await response.json();
      setAccessRequests(data.results || data);
    } catch (err) {
      setError(err.message || "Failed to load access requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProperties = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/"), {
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available properties');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message || "Failed to fetch properties");
      return [];
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/users/guests/property-access/"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${guestInfo.guest_code}`
        },
        body: JSON.stringify({
          guest_user: parseInt(formData.guest_user),
          property: parseInt(formData.property),
          notes: formData.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to grant property access');
      }

      const data = await response.json();
      setSuccessMessage("Property access granted successfully");
      setAccessRequests([...accessRequests, data]);
      
      // Reset form
      setFormData({
        guest_user: "",
        property: "",
        notes: ""
      });
      setShowGrantForm(false);
    } catch (err) {
      setError(err.message || "Failed to grant access");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId) => {
    if (!window.confirm('Are you sure you want to revoke this access?')) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/users/guests/property-access/${accessId}/`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      setAccessRequests(accessRequests.filter(req => req.id !== accessId));
      setSuccessMessage("Property access revoked successfully");
    } catch (err) {
      setError(err.message || "Failed to revoke access");
    }
  };

  const getStatusBadge = (request) => {
    if (request.is_active) {
      return <span className="status-badge status-success">Active</span>;
    }
    return <span className="status-badge status-neutral">Inactive</span>;
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Guest Property Access</h2>
            <p>Manage property access for guest users</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowGrantForm(true)}
          >
            Grant Property Access
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {showGrantForm && (
          <div className="form-overlay">
            <div className="form-modal">
              <h3>Grant Property Access</h3>
              <form className="input-grid" onSubmit={handleGrantAccess}>
                <div className="form-group">
                  <label>Guest User</label>
                  <select
                    name="guest_user"
                    value={formData.guest_user}
                    onChange={(e) => setFormData({...formData, guest_user: e.target.value})}
                    required
                  >
                    <option value="">Select Guest User</option>
                    {guestInfo.accessible_properties?.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title || prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Property</label>
                  <select
                    name="property"
                    value={formData.property}
                    onChange={(e) => setFormData({...formData, property: e.target.value})}
                    required
                  >
                    <option value="">Select Property</option>
                    {guestInfo.accessible_properties?.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title || prop.name} - {prop.serial_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Access Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Add any notes about this access grant"
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowGrantForm(false);
                      setFormData({
                        guest_user: "",
                        property: "",
                        notes: ""
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Granting...' : 'Grant Access'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="access-requests">
          <h3>Current Access Requests ({accessRequests.length})</h3>
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading access requests...</p>
            </div>
          ) : accessRequests.length === 0 ? (
            <div className="no-results">
              <h3>No access requests found</h3>
              <p>Grant property access to guest users to see them here.</p>
            </div>
          ) : (
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Guest User</th>
                    <th>Property</th>
                    <th>Granted By</th>
                    <th>Granted At</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRequests.map(request => (
                    <tr key={request.id}>
                      <td>{request.guest_user_info?.full_name || 'N/A'}</td>
                      <td>{request.property?.title || request.property?.name || 'N/A'}</td>
                      <td>{request.granted_by?.username || 'N/A'}</td>
                      <td>
                        {request.access_granted_at 
                          ? new Date(request.access_granted_at).toLocaleString() 
                          : 'N/A'
                        }
                      </td>
                      <td>{getStatusBadge(request)}</td>
                      <td>{request.notes || 'N/A'}</td>
                      <td>
                        <button 
                          className="btn-small btn-danger" 
                          onClick={() => handleRevokeAccess(request.id)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuestPropertyAccess;
