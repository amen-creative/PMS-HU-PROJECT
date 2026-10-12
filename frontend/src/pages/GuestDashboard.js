import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/AppIcon";
import { apiUrl } from "../config/api";
import { BarChart, PieChart, LineChart, StatCard } from "../components/Charts";
import "./Properties.css";
import "../components/Charts.css";

function GuestDashboard() {
  const { guestInfo } = useAuth();
  const [guestProperties, setGuestProperties] = useState([]);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (guestInfo?.is_guest) {
      fetchGuestData();
    }
  }, [guestInfo]);

  const fetchGuestData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch accessible properties
      const propertiesResponse = await fetch(apiUrl(`/api/properties/search/?assigned_user=${encodeURIComponent(guestInfo.email)}`), {
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      // Fetch recent verifications
      const verificationsResponse = await fetch(apiUrl(`/api/users/guests/verify/?guest_code=${encodeURIComponent(guestInfo.guest_code)}`), {
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      if (!propertiesResponse.ok || !verificationsResponse.ok) {
        throw new Error('Failed to fetch guest data');
      }

      const propertiesData = await propertiesResponse.json();
      const verificationsData = await verificationsResponse.json();

      setGuestProperties(propertiesData.results || []);
      setRecentVerifications(verificationsData.recent_verifications || []);
    } catch (err) {
      setError(err.message || "Failed to load guest data");
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyVerification = async (propertyId) => {
    try {
      const response = await fetch(apiUrl("/api/users/guests/verify/"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${guestInfo.guest_code}`
        },
        body: JSON.stringify({
          guest_code: guestInfo.guest_code,
          property_id: propertyId
        })
      });

      if (!response.ok) {
        throw new Error('Property verification failed');
      }

      const data = await response.json();
      
      // Show verification result
      alert(`Property verified: ${data.message}`);
      
      // Refresh recent verifications
      fetchGuestData();
    } catch (err) {
      setError(err.message || "Verification failed");
    }
  };

  const getAccessLevelBadge = (level) => {
    const colors = {
      'VIEW_ONLY': 'status-neutral',
      'LIMITED_ACCESS': 'status-warning',
      'FULL_ACCESS': 'status-success'
    };
    return <span className={`access-level-badge ${colors[level] || 'status-neutral'}`}>
      {level.replace('_', ' ')}
    </span>;
  };

  if (!guestInfo?.is_guest) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <div className="page-head">
            <h2>Access Denied</h2>
            <p>Guest access required to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Guest Dashboard</h2>
            <p>Welcome, {guestInfo.full_name || 'Guest User'}</p>
          </div>
          <div className="guest-info">
            <AppIcon name="user" size={16} />
            <span>{guestInfo.full_name || 'Guest User'}</span>
            <span>|</span>
            <AppIcon name="calendar" size={16} />
            <span>{guestInfo.event_name || 'Event'}</span>
            <span>|</span>
            {getAccessLevelBadge(guestInfo.access_level)}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading guest dashboard...</p>
          </div>
        ) : (
          <div className="guest-dashboard-content">
            {/* Guest Information */}
            <div className="summary-card">
              <h3>Your Access Information</h3>
              <div className="guest-details-grid">
                <div>
                  <span>Full Name</span>
                  <strong>{guestInfo.full_name || 'N/A'}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{guestInfo.email || 'N/A'}</strong>
                </div>
                <div>
                  <span>Organization</span>
                  <strong>{guestInfo.organization || 'N/A'}</strong>
                </div>
                <div>
                  <span>Event</span>
                  <strong>{guestInfo.event_name || 'N/A'}</strong>
                </div>
                <div>
                  <span>Access Level</span>
                  <strong>{getAccessLevelBadge(guestInfo.access_level)}</strong>
                </div>
              </div>
            </div>

            {/* Available Properties */}
            <div className="report-section">
              <h3>Accessible Properties ({guestProperties.length})</h3>
              {guestProperties.length === 0 ? (
                <div className="no-results">
                  <h3>No properties available</h3>
                  <p>Contact event organizer for property access.</p>
                </div>
              ) : (
                <div className="properties-table">
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Property Name</th>
                        <th>Serial Number</th>
                        <th>Category</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestProperties.map(property => (
                        <tr key={property.id}>
                          <td>
                            <strong>{property.title || property.name || 'N/A'}</strong>
                            {property.description && <small>{property.description}</small>}
                          </td>
                          <td>{property.serial_number || 'N/A'}</td>
                          <td>{property.category || 'N/A'}</td>
                          <td>{property.department || 'N/A'}</td>
                          <td>
                            <span className={`status-badge status-${property.status?.toLowerCase() || 'neutral'}`}>
                              {property.status || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn-small btn-primary" 
                              onClick={() => handlePropertyVerification(property.id)}
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Verifications */}
            <div className="report-section">
              <h3>Recent Verifications ({recentVerifications.length})</h3>
              {recentVerifications.length === 0 ? (
                <div className="no-results">
                  <h3>No verifications yet</h3>
                  <p>Start verifying properties to see your activity here.</p>
                </div>
              ) : (
                <div className="verifications-list">
                  {recentVerifications.slice(0, 10).map((verification, index) => (
                    <div key={index} className="verification-item">
                      <div className="verification-header">
                        <strong>{verification.property?.title || verification.property?.name || 'Unknown Property'}</strong>
                        <span className={`verification-status ${verification.status?.toLowerCase() || 'neutral'}`}>
                          {verification.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="verification-details">
                        <span>Verified at: {verification.verified_at ? new Date(verification.verified_at).toLocaleString() : 'N/A'}</span>
                        {verification.notes && <span>Notes: {verification.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestDashboard;
