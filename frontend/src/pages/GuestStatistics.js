import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/AppIcon";
import { apiUrl } from "../config/api";
import "./Properties.css";

function GuestStatistics() {
  const { guestInfo } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (guestInfo?.is_guest) {
      fetchStatistics();
    }
  }, [guestInfo]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(apiUrl("/api/users/guests/statistics/"), {
        headers: {
          Authorization: `Bearer ${guestInfo.guest_code}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch guest statistics");
      }

      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
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
            <h2>Guest Statistics</h2>
            <p>Analytics and insights for guest user management</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading guest statistics...</p>
          </div>
        ) : (
          statistics && (
            <>
              {/* Overview Cards */}
              <div className="stats-grid">
                <div className="summary-card">
                  <div className="stat-header">
                    <AppIcon name="users" size={20} />
                    <h3>Total Guests</h3>
                  </div>
                  <strong>{statistics.total_guests || 0}</strong>
                  <span>Registered guest users</span>
                </div>

                <div className="summary-card">
                  <div className="stat-header">
                    <AppIcon name="activity" size={20} />
                    <h3>Active Guests</h3>
                  </div>
                  <strong>{statistics.active_guests || 0}</strong>
                  <span>Currently active</span>
                </div>

                <div className="summary-card">
                  <div className="stat-header">
                    <AppIcon name="calendar" size={20} />
                    <h3>Expired Guests</h3>
                  </div>
                  <strong>{statistics.expired_guests || 0}</strong>
                  <span>Access expired</span>
                </div>

                <div className="summary-card">
                  <div className="stat-header">
                    <AppIcon name="alert-triangle" size={20} />
                    <h3>Access Rate</h3>
                  </div>
                  <strong>
                    {statistics.total_guests > 0
                      ? Math.round(
                          (statistics.active_guests /
                            statistics.total_guests) *
                            100
                        )
                      : 0}
                    %
                  </strong>
                  <span>Active vs total ratio</span>
                </div>
              </div>

              {/* Event Statistics */}
              <div className="report-section">
                <h3>Event-Based Statistics</h3>
                <div className="event-stats-grid">
                  {statistics.event_statistics?.map((event, index) => (
                    <div key={index} className="event-stat-card">
                      <h4>{event.event_name}</h4>
                      <div className="event-metrics">
                        <div className="metric">
                          <strong>{event.guest_count}</strong>
                          <span>Total Guests</span>
                        </div>
                        <div className="metric">
                          <strong>{event.active_count}</strong>
                          <span>Active Guests</span>
                        </div>
                        <div className="metric">
                          <strong>{event.access_rate || "N/A"}</strong>
                          <span>Access Rate</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Guest Activity */}
              <div className="report-section">
                <h3>Recent Guest Activity</h3>
                <div className="properties-table">
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>Email</th>
                        <th>Organization</th>
                        <th>Event</th>
                        <th>Last Access</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.recent_guests
                        ?.slice(0, 10)
                        .map((guest, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{guest.full_name}</strong>
                              {guest.phone_number && (
                                <small>{guest.phone_number}</small>
                              )}
                            </td>
                            <td>{guest.email}</td>
                            <td>{guest.organization || "N/A"}</td>
                            <td>{guest.event_name || "N/A"}</td>
                            <td>
                              {guest.last_access
                                ? new Date(
                                    guest.last_access
                                  ).toLocaleDateString()
                                : "Never"}
                            </td>
                            <td>
                              <span
                                className={`status-badge ${
                                  guest.is_active
                                    ? "status-success"
                                    : "status-neutral"
                                }`}
                              >
                                {guest.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Access Level Distribution */}
              <div className="report-section">
                <h3>Access Level Distribution</h3>
                <div className="chart-bars">
                  <div className="bar-container">
                    <div
                      className="bar-fill view-only"
                      style={{
                        width: `${
                          (statistics.access_levels?.view_only || 0) * 100
                        }%`
                      }}
                    />
                  </div>
                  <div className="bar-container">
                    <div
                      className="bar-fill limited-access"
                      style={{
                        width: `${
                          (statistics.access_levels?.limited_access || 0) *
                          100
                        }%`
                      }}
                    />
                  </div>
                  <div className="bar-container">
                    <div
                      className="bar-fill full-access"
                      style={{
                        width: `${
                          (statistics.access_levels?.full_access || 0) * 100
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

export default GuestStatistics;
