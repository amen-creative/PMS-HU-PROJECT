import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import { BarChart, PieChart, LineChart, StatCard } from "../components/Charts";
import "./Enterprise.css";
import "../components/Charts.css";

function AdminDashboard() {
  const { user, accessToken, role } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [accessToken]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/dashboard/stats/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getDashboardTitle = () => {
    const titles = {
      'ADMIN': 'Admin Dashboard',
      'PROPERTY_OFFICER': 'Property Officer Dashboard',
      'DEPT_HEAD': 'Department Head Dashboard',
      'SECURITY': 'Security Dashboard',
      'IT_OFFICER': 'IT Officer Dashboard',
      'STAFF': 'Staff Dashboard'
    };
    return titles[role] || 'Dashboard';
  };

  if (loading) {
    return (
      <div className="enterprise-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="enterprise-container">
      <ToastContainer />
      <div className="enterprise-header">
        <div className="header-content">
          <div className="header-left">
            <h1>{getDashboardTitle()}</h1>
            <p className="header-subtitle">
              Welcome back, {user?.full_name || user?.username}!
            </p>
          </div>
          <div className="header-right">
            {role === 'ADMIN' && (
              <Link to="/settings" className="btn-secondary">
                Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Overview Statistics */}
      <div className="dashboard-section">
        <h2>Overview</h2>
        <div className="dashboard-grid">
          {role === 'ADMIN' && (
            <>
              <StatCard
                title="Total Properties"
                value={dashboardData?.total_properties || 0}
                icon="💻"
                color="#4f46e5"
              />
              <StatCard
                title="Total Users"
                value={dashboardData?.total_users || 0}
                icon="👥"
                color="#10b981"
              />
              <StatCard
                title="Active Assignments"
                value={dashboardData?.active_assignments || 0}
                icon="✅"
                color="#f59e0b"
              />
              <StatCard
                title="Open Incidents"
                value={dashboardData?.open_incidents || 0}
                icon="⚠️"
                color="#ef4444"
              />
            </>
          )}
          {role === 'PROPERTY_OFFICER' && (
            <>
              <StatCard
                title="Registered Properties"
                value={dashboardData?.registered_properties || 0}
                icon="💻"
                color="#4f46e5"
              />
              <StatCard
                title="Pending Assignments"
                value={dashboardData?.pending_assignments || 0}
                icon="⏳"
                color="#f59e0b"
              />
              <StatCard
                title="Pending Transfers"
                value={dashboardData?.pending_transfers || 0}
                icon="🔄"
                color="#10b981"
              />
              <StatCard
                title="Open Incidents"
                value={dashboardData?.open_incidents || 0}
                icon="⚠️"
                color="#ef4444"
              />
            </>
          )}
          {role === 'DEPT_HEAD' && (
            <>
              <StatCard
                title="Department Properties"
                value={dashboardData?.department_properties || 0}
                icon="💻"
                color="#4f46e5"
              />
              <StatCard
                title="Active Assignments"
                value={dashboardData?.department_assignments || 0}
                icon="✅"
                color="#10b981"
              />
              <StatCard
                title="Pending Transfers"
                value={dashboardData?.pending_transfers || 0}
                icon="🔄"
                color="#f59e0b"
              />
              <StatCard
                title="Open Incidents"
                value={dashboardData?.open_incidents || 0}
                icon="⚠️"
                color="#ef4444"
              />
            </>
          )}
          {role === 'SECURITY' && (
            <>
              <StatCard
                title="Active Guests"
                value={dashboardData?.active_guests || 0}
                icon="👤"
                color="#4f46e5"
              />
              <StatCard
                title="Open Incidents"
                value={dashboardData?.open_incidents || 0}
                icon="⚠️"
                color="#ef4444"
              />
              <StatCard
                title="Assigned Incidents"
                value={dashboardData?.assigned_incidents || 0}
                icon="📋"
                color="#f59e0b"
              />
              <StatCard
                title="Pending Verifications"
                value={dashboardData?.pending_verifications || 0}
                icon="🔍"
                color="#10b981"
              />
            </>
          )}
          {role === 'IT_OFFICER' && (
            <>
              <StatCard
                title="Pending Verifications"
                value={dashboardData?.pending_verifications || 0}
                icon="⏳"
                color="#f59e0b"
              />
              <StatCard
                title="Verified Devices"
                value={dashboardData?.verified_devices || 0}
                icon="✅"
                color="#10b981"
              />
              <StatCard
                title="Rejected Devices"
                value={dashboardData?.rejected_devices || 0}
                icon="❌"
                color="#ef4444"
              />
              <StatCard
                title="Unread Notifications"
                value={dashboardData?.unread_notifications || 0}
                icon="🔔"
                color="#4f46e5"
              />
            </>
          )}
          {role === 'STAFF' && (
            <>
              <StatCard
                title="My Assignments"
                value={dashboardData?.my_assignments || 0}
                icon="💻"
                color="#4f46e5"
              />
              <StatCard
                title="Pending Transfers"
                value={dashboardData?.my_transfers || 0}
                icon="🔄"
                color="#f59e0b"
              />
              <StatCard
                title="Unread Notifications"
                value={dashboardData?.unread_notifications || 0}
                icon="�"
                color="#10b981"
              />
            </>
          )}
        </div>
      </div>

      {/* Admin-specific charts */}
      {role === 'ADMIN' && dashboardData?.property_status && (
        <div className="dashboard-section">
          <h2>Property Status Distribution</h2>
          <PieChart
            data={Object.entries(dashboardData.property_status).map(([label, value]) => ({ label, value }))}
            title="Property Status"
          />
        </div>
      )}

      {role === 'ADMIN' && dashboardData?.departments && (
        <div className="dashboard-section">
          <h2>Department Overview</h2>
          <BarChart
            data={dashboardData.departments.map(dept => ({
              label: dept.name,
              value: dept.property_count
            }))}
            title="Properties by Department"
            color="#4f46e5"
          />
        </div>
      )}

      {/* Security-specific recent guests */}
      {role === 'SECURITY' && dashboardData?.recent_guests && (
        <div className="dashboard-section">
          <h2>Recent Guests</h2>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Entry Date</th>
                  <th>Exit Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recent_guests.map((guest, index) => (
                  <tr key={index}>
                    <td>{guest.full_name}</td>
                    <td>{guest.entry_date}</td>
                    <td>{guest.exit_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IT Officer-specific pending queue */}
      {role === 'IT_OFFICER' && dashboardData?.pending_queue && (
        <div className="dashboard-section">
          <h2>Pending Verification Queue</h2>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Serial Number</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.pending_queue.map((item, index) => (
                  <tr key={index}>
                    <td>{item.student__full_name}</td>
                    <td>{item.serial_number_submitted}</td>
                    <td>{item.submitted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="dashboard-grid-3">
          {role === 'ADMIN' && (
            <>
              <Link to="/properties" className="action-card">
                <div className="action-icon">💻</div>
                <div className="action-content">
                  <h3>Manage Properties</h3>
                  <p>View and manage all properties</p>
                </div>
              </Link>
              <Link to="/reports" className="action-card">
                <div className="action-icon">📊</div>
                <div className="action-content">
                  <h3>View Reports</h3>
                  <p>Generate system reports</p>
                </div>
              </Link>
              <Link to="/settings" className="action-card">
                <div className="action-icon">⚙️</div>
                <div className="action-content">
                  <h3>System Settings</h3>
                  <p>Configure system settings</p>
                </div>
              </Link>
            </>
          )}
          {role === 'PROPERTY_OFFICER' && (
            <>
              <Link to="/properties" className="action-card">
                <div className="action-icon">💻</div>
                <div className="action-content">
                  <h3>Manage Properties</h3>
                  <p>View and manage properties</p>
                </div>
              </Link>
              <Link to="/assignments" className="action-card">
                <div className="action-icon">✅</div>
                <div className="action-content">
                  <h3>Assignments</h3>
                  <p>Review and approve assignments</p>
                </div>
              </Link>
              <Link to="/incidents" className="action-card">
                <div className="action-icon">⚠️</div>
                <div className="action-content">
                  <h3>Incidents</h3>
                  <p>View and manage incidents</p>
                </div>
              </Link>
            </>
          )}
          {role === 'SECURITY' && (
            <>
              <Link to="/guest-management" className="action-card">
                <div className="action-icon">👤</div>
                <div className="action-content">
                  <h3>Guest Management</h3>
                  <p>Register and manage guests</p>
                </div>
              </Link>
              <Link to="/verification" className="action-card">
                <div className="action-icon">🔍</div>
                <div className="action-content">
                  <h3>QR Verification</h3>
                  <p>Verify property QR codes</p>
                </div>
              </Link>
              <Link to="/incidents" className="action-card">
                <div className="action-icon">⚠️</div>
                <div className="action-content">
                  <h3>Incidents</h3>
                  <p>View and manage incidents</p>
                </div>
              </Link>
            </>
          )}
          {role === 'IT_OFFICER' && (
            <>
              <Link to="/student-devices" className="action-card">
                <div className="action-icon">💻</div>
                <div className="action-content">
                  <h3>Student Devices</h3>
                  <p>Verify student devices</p>
                </div>
              </Link>
              <Link to="/notifications" className="action-card">
                <div className="action-icon">�</div>
                <div className="action-content">
                  <h3>Notifications</h3>
                  <p>View your notifications</p>
                </div>
              </Link>
            </>
          )}
          {role === 'STAFF' && (
            <>
              <Link to="/properties" className="action-card">
                <div className="action-icon">💻</div>
                <div className="action-content">
                  <h3>My Properties</h3>
                  <p>View assigned properties</p>
                </div>
              </Link>
              <Link to="/transfers" className="action-card">
                <div className="action-icon">�</div>
                <div className="action-content">
                  <h3>Transfers</h3>
                  <p>Request property transfers</p>
                </div>
              </Link>
              <Link to="/incidents" className="action-card">
                <div className="action-icon">⚠️</div>
                <div className="action-content">
                  <h3>Report Incident</h3>
                  <p>Report property incidents</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
