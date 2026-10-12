import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import { BarChart, PieChart, LineChart, StatCard } from "../components/Charts";
import "./Enterprise.css";
import "../components/Charts.css";

function StudentDashboard() {
  const { user, accessToken } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [verificationStats, setVerificationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
    fetchStudentDevices();
    fetchVerificationStats();
  }, [accessToken]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(apiUrl("/api/dashboard/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load dashboard data");

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchStudentDevices = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/student-devices/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load devices");

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStats = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/verification-stats/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load verification stats");

      const data = await response.json();
      setVerificationStats(data);
    } catch (error) {
      console.error("Failed to load verification stats:", error);
    }
  };

  const handleGateVerification = async (propertyCode) => {
    try {
      const response = await fetch(apiUrl("/api/properties/gate-verification/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          property_code: propertyCode,
          university_id: user.university_id,
          verification_type: "GATE_ENTRY",
        }),
      });

      if (!response.ok) throw new Error("Verification failed");

      const data = await response.json();
      toast.success("Gate verification successful!", {
        position: "top-right",
        autoClose: 3000,
      });

      // Refresh data
      fetchStudentDevices();
      fetchVerificationStats();
    } catch (error) {
      toast.error(error.message || "Verification failed", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const getDeviceStatusColor = (status) => {
    switch (status) {
      case "VERIFIED":
        return "#10b981";
      case "PENDING_VERIFICATION":
        return "#f59e0b";
      case "ASSIGNED":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getDeviceStatusText = (status) => {
    switch (status) {
      case "VERIFIED":
        return "Verified";
      case "PENDING_VERIFICATION":
        return "Pending Verification";
      case "ASSIGNED":
        return "Assigned";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="enterprise-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-container">
      <ToastContainer />
      <div className="enterprise-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Student Dashboard</h1>
            <p className="header-subtitle">
              Welcome back, {user?.first_name || user?.username}!
            </p>
          </div>
          <div className="header-right">
            <Link to="/settings" className="btn-secondary">
              Profile Settings
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="dashboard-section">
        <h2>Overview</h2>
        <div className="dashboard-grid">
          <StatCard
            title="My Devices"
            value={devices.length}
            change={12}
            icon="💻"
            color="#4f46e5"
          />
          <StatCard
            title="Verified Devices"
            value={verificationStats?.verified_devices || 0}
            change={8}
            icon="✅"
            color="#10b981"
          />
          <StatCard
            title="Pending Verification"
            value={verificationStats?.pending_devices || 0}
            change={-5}
            icon="⏳"
            color="#f59e0b"
          />
          <StatCard
            title="Registration Status"
            value={verificationStats?.registration_complete ? "Complete" : "Pending"}
            icon="📋"
            color="#7c3aed"
          />
        </div>
      </div>

      <div className="dashboard-grid-2">
        <BarChart
          data={[
            { label: "Laptops", value: devices.filter(d => d.category === "Laptop").length },
            { label: "Desktops", value: devices.filter(d => d.category === "Desktop").length },
            { label: "Tablets", value: devices.filter(d => d.category === "Tablet").length },
            { label: "Others", value: devices.filter(d => d.category === "Other").length }
          ]}
          title="Device Categories"
          color="#4f46e5"
        />
        
        <PieChart
          data={[
            { label: "Verified", value: verificationStats?.verified_devices || 0 },
            { label: "Pending", value: verificationStats?.pending_devices || 0 },
            { label: "Rejected", value: verificationStats?.rejected_devices || 0 }
          ]}
          title="Verification Status"
        />
      </div>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <LineChart
          data={[
            { label: "Mon", value: 2 },
            { label: "Tue", value: 3 },
            { label: "Wed", value: 1 },
            { label: "Thu", value: 4 },
            { label: "Fri", value: 2 },
            { label: "Sat", value: 0 },
            { label: "Sun", value: 1 }
          ]}
          title="Weekly Registration Activity"
          color="#7c3aed"
        />
      </div>

      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="dashboard-grid">
          <StatCard
            title="Pending Verification"
            value={verificationStats?.pending_verification || 0}
            change={-2}
            icon="⏳"
            color="#f59e0b"
          />
          <StatCard
            title="Gate Verifications"
            value={verificationStats?.recent_verifications || 0}
            change={15}
            icon="🚪"
            color="#10b981"
          />
        </div>
      </div>

      {/* My Devices Section */}
      <div className="dashboard-section">
          <div className="section-header">
            <h2>My Devices</h2>
            <span className="device-count">{devices.length} devices</span>
          </div>
          
          {devices.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-laptop"></i>
              <h3>No devices assigned</h3>
              <p>You don't have any devices assigned to you yet.</p>
            </div>
          ) : (
            <div className="devices-grid">
              {devices.map((device) => (
                <div key={device.id} className="device-card">
                  <div className="device-header">
                    <div className="device-info">
                      <h3>{device.title}</h3>
                      <span className="device-category">{device.category}</span>
                    </div>
                    <div 
                      className="device-status"
                      style={{ backgroundColor: getDeviceStatusColor(device.status) }}
                    >
                      {getDeviceStatusText(device.status)}
                    </div>
                  </div>
                  
                  <div className="device-details">
                    <div className="detail-row">
                      <span className="detail-label">Serial Number:</span>
                      <span className="detail-value">{device.serial_number}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Property Code:</span>
                      <span className="detail-value">{device.property_code}</span>
                    </div>
                    {device.last_verification && (
                      <div className="detail-row">
                        <span className="detail-label">Last Verification:</span>
                        <span className="detail-value">
                          {new Date(device.last_verification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="device-actions">
                    {device.needs_gate_verification && (
                      <button
                        onClick={() => handleGateVerification(device.property_code)}
                        className="btn-primary"
                      >
                        <i className="fas fa-qrcode"></i>
                        Gate Verification
                      </button>
                    )}
                    
                    <Link to={`/properties/${device.id}`} className="btn-secondary">
                      <i className="fas fa-eye"></i>
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/properties" className="action-card">
              <div className="action-icon">
                <i className="fas fa-list"></i>
              </div>
              <div className="action-content">
                <h3>View All Properties</h3>
                <p>Browse all available properties</p>
              </div>
            </Link>
            
            <Link to="/verification" className="action-card">
              <div className="action-icon">
                <i className="fas fa-qrcode"></i>
              </div>
              <div className="action-content">
                <h3>Scan QR Code</h3>
                <p>Verify property with QR code</p>
              </div>
            </Link>
            
            <Link to="/incidents" className="action-card">
              <div className="action-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="action-content">
                <h3>Report Incident</h3>
                <p>Report property issues</p>
              </div>
            </Link>
            
            <Link to="/settings" className="action-card">
              <div className="action-icon">
                <i className="fas fa-user-cog"></i>
              </div>
              <div className="action-content">
                <h3>Profile Settings</h3>
                <p>Update your profile information</p>
              </div>
            </Link>
          </div>
        </div>

      {/* Recent Activity */}
      {dashboardData?.recent_activity && (
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {dashboardData.recent_activity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  <i className="fas fa-circle"></i>
                </div>
                <div className="activity-content">
                  <p>{activity.description}</p>
                  <small>{new Date(activity.timestamp).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
