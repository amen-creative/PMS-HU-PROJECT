import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";
import { apiUrl } from "../config/api";
import "./EnterpriseDashboard.css";

const rolePresets = {
  ADMIN: {
    eyebrow: "University-wide Control Center",
    title: "Campus property operations at a glance",
    description:
      "Monitor lifecycle health, assignment flow, and compliance across colleges, labs, offices, and shared facilities."
  },
  PROPERTY_OFFICER: {
    eyebrow: "Operations Workspace",
    title: "Asset registration and field verification",
    description:
      "Keep incoming assets cataloged, tagged, and assigned with fewer handoff delays across university units."
  },
  DEPT_HEAD: {
    eyebrow: "Department Oversight",
    title: "Approvals and asset visibility for your unit",
    description:
      "Review requests, track utilization, and keep departmental property records aligned with operational needs."
  },
  SECURITY: {
    eyebrow: "Security Verification",
    title: "Frontline validation for movement and authenticity",
    description:
      "Verify tagged property, monitor unusual movement, and respond quickly to asset anomalies from entry and exit points."
  },
  USER: {
    eyebrow: "Personal Workspace",
    title: "Your assigned items and service requests",
    description:
      "Track assets under your responsibility, request transfers, and report issues without losing visibility into approvals."
  }
};

const statusToneMap = {
  AVAILABLE: "success",
  ASSIGNED: "primary",
  PENDING: "warning",
  APPROVED: "primary",
  DAMAGED: "danger",
  LOST: "danger",
  ACTIVE: "success"
};

function formatTime(value) {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function EnterpriseDashboard({ role: roleOverride }) {
  const { user, role: authRole, accessToken } = useAuth();
  const role = roleOverride || authRole || "USER";
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("asset");
  const [sortDirection, setSortDirection] = useState("asc");
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResponse, propertiesResponse] = await Promise.all([
          fetch(apiUrl("/api/dashboard/"), {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(apiUrl("/api/properties/"), {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ]);

        if (!dashboardResponse.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        if (!propertiesResponse.ok) {
          throw new Error("Failed to fetch property registry data");
        }

        const dashboardJson = await dashboardResponse.json();
        const propertiesJson = await propertiesResponse.json();
        setDashboardData(dashboardJson);
        setProperties(Array.isArray(propertiesJson.results) ? propertiesJson.results : Array.isArray(propertiesJson) ? propertiesJson : []);
      } catch (err) {
        setError(err.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchDashboardData();
    } else {
      setLoading(false);
      setDashboardData(null);
      setProperties([]);
    }
  }, [accessToken]);

  const config = rolePresets[role] || rolePresets.USER;

  const statCards = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    if (dashboardData.user_role === "ADMIN" || dashboardData.user_role === "PROPERTY_OFFICER") {
      return [
        {
          label: "Registered Assets",
          value: formatCount(dashboardData.total_registered_assets),
          trend: "Live data",
          tone: "primary",
          icon: "assets"
        },
        {
          label: "Pending Transfers",
          value: formatCount(dashboardData.pending_transfers),
          trend: "Awaiting action",
          tone: "warning",
          icon: "transfers"
        },
        {
          label: "Missing Items",
          value: formatCount(dashboardData.missing_items),
          trend: "Track closely",
          tone: "danger",
          icon: "incidents"
        },
        {
          label: "Damaged Items",
          value: formatCount(dashboardData.damaged_items),
          trend: "Needs follow-up",
          tone: "warning",
          icon: "shield"
        }
      ];
    }

    if (dashboardData.user_role === "SECURITY") {
      return [
        {
          label: "Invalid Verifications",
          value: formatCount(dashboardData.real_time_alerts?.invalid_verifications),
          trend: "Flagged checks",
          tone: "danger",
          icon: "shield"
        },
        {
          label: "Suspicious Movements",
          value: formatCount(dashboardData.real_time_alerts?.suspicious_movements),
          trend: "Needs review",
          tone: "warning",
          icon: "incidents"
        },
        {
          label: "Recent Verifications",
          value: formatCount(dashboardData.recent_verifications?.length),
          trend: "Live history",
          tone: "success",
          icon: "qr"
        },
        {
          label: "Security Incidents",
          value: formatCount(dashboardData.security_incidents?.length),
          trend: "Open cases",
          tone: "primary",
          icon: "incidents"
        }
      ];
    }

    if (dashboardData.user_role === "DEPT_HEAD") {
      return [
        {
          label: "Department Assets",
          value: formatCount(dashboardData.department_items),
          trend: "Visible assets",
          tone: "primary",
          icon: "assets"
        },
        {
          label: "Transfer Requests",
          value: formatCount(dashboardData.transfer_requests),
          trend: "Pending review",
          tone: "warning",
          icon: "transfers"
        },
        {
          label: "Incident Logs",
          value: formatCount(dashboardData.incident_logs),
          trend: "Reported issues",
          tone: "danger",
          icon: "incidents"
        },
        {
          label: "Assigned Value",
          value: `$${formatCount(dashboardData.property_value_summary?.assigned_value)}`,
          trend: "Tracked value",
          tone: "success",
          icon: "assets"
        }
      ];
    }

    return [
      {
        label: "Assigned Items",
        value: formatCount(dashboardData.assigned_items),
        trend: "Your current assets",
        tone: "primary",
        icon: "assignments"
      },
      {
        label: "Transfer Requests",
        value: formatCount(dashboardData.transfer_requests),
        trend: "Awaiting approval",
        tone: "warning",
        icon: "transfers"
      },
      {
        label: "Incident Reports",
        value: formatCount(dashboardData.incident_reports),
        trend: "Filed by you",
        tone: "danger",
        icon: "incidents"
      },
      {
        label: "Available for Transfer",
        value: formatCount(dashboardData.available_for_transfer),
        trend: "Can be moved",
        tone: "success",
        icon: "assets"
      }
    ];
  }, [dashboardData]);

  const tableRows = useMemo(() => {
    return properties.slice(0, 20).map((property) => ({
      asset: property.title || property.name || "Untitled Property",
      code: property.serial_number || property.property_code || "N/A",
      office: property.department || property.location || "Unassigned",
      status: (property.status || "UNKNOWN").toUpperCase(),
      owner:
        property.assignee_username ||
        property.owner_username ||
        property.created_by_username ||
        "Unassigned",
      channel: property.approval_status || property.condition || "No details"
    }));
  }, [properties]);

  const timelineItems = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    if (Array.isArray(dashboardData.recent_activity) && dashboardData.recent_activity.length > 0) {
      return dashboardData.recent_activity.slice(0, 5).map((activity) => ({
        title: activity.action || "Activity",
        text: activity.description || "System activity recorded.",
        time: formatTime(activity.timestamp)
      }));
    }

    if (
      dashboardData.user_role === "SECURITY" &&
      Array.isArray(dashboardData.recent_verifications) &&
      dashboardData.recent_verifications.length > 0
    ) {
      return dashboardData.recent_verifications.slice(0, 5).map((item) => ({
        title: `Verification ${item.verification_status || "RECORDED"}`,
        text: item.serial_number || "Security verification completed.",
        time: formatTime(item.verified_at)
      }));
    }

    return [];
  }, [dashboardData]);

  const alerts = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    const liveAlerts = [];

    if (dashboardData.pending_transfers > 0) {
      liveAlerts.push({
        title: "Pending transfers",
        text: `${dashboardData.pending_transfers} transfer request(s) need attention.`,
        tone: "warning"
      });
    }

    if (dashboardData.missing_items > 0) {
      liveAlerts.push({
        title: "Missing property",
        text: `${dashboardData.missing_items} asset(s) are marked missing.`,
        tone: "danger"
      });
    }

    if (dashboardData.damaged_items > 0) {
      liveAlerts.push({
        title: "Damaged assets",
        text: `${dashboardData.damaged_items} asset(s) are marked damaged.`,
        tone: "warning"
      });
    }

    if (dashboardData.real_time_alerts?.invalid_verifications > 0) {
      liveAlerts.push({
        title: "Invalid verifications",
        text: `${dashboardData.real_time_alerts.invalid_verifications} verification(s) failed.`,
        tone: "danger"
      });
    }

    if (dashboardData.real_time_alerts?.suspicious_movements > 0) {
      liveAlerts.push({
        title: "Suspicious movement",
        text: `${dashboardData.real_time_alerts.suspicious_movements} movement alert(s) recorded.`,
        tone: "warning"
      });
    }

    if (dashboardData.incident_logs > 0) {
      liveAlerts.push({
        title: "Incident logs",
        text: `${dashboardData.incident_logs} incident log(s) are open in your scope.`,
        tone: "danger"
      });
    }

    if (dashboardData.transfer_requests > 0 && dashboardData.user_role === "DEPT_HEAD") {
      liveAlerts.push({
        title: "Department approvals",
        text: `${dashboardData.transfer_requests} transfer request(s) need department review.`,
        tone: "warning"
      });
    }

    if (liveAlerts.length === 0) {
      return [
        {
          title: "No active alerts",
          text: "There are no current issues in your visible workspace.",
          tone: "success"
        }
      ];
    }

    return liveAlerts.slice(0, 3);
  }, [dashboardData]);

  const filteredRows = useMemo(() => {
    const visibleRows =
      statusFilter === "ALL"
        ? tableRows
        : tableRows.filter((row) => row.status === statusFilter);

    return [...visibleRows].sort((first, second) => {
      const left = String(first[sortKey] || "").toLowerCase();
      const right = String(second[sortKey] || "").toLowerCase();
      if (left < right) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (left > right) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [sortDirection, sortKey, statusFilter, tableRows]);

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(tableRows.map((row) => row.status).filter(Boolean)));
    return ["ALL", ...values];
  }, [tableRows]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const userDisplayName = user?.username || "Campus Administrator";

  return (
    <div className="enterprise-dashboard">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          <div className="hero-meta">
            <div className="meta-chip">
              <AppIcon name="sparkle" size={14} />
              <span>Haramaya University PMS</span>
            </div>
            <div className="meta-chip">
              <AppIcon name="activity" size={14} />
              <span>Live operational snapshot</span>
            </div>
          </div>
        </div>
        <div className="hero-aside">
          <div className="hero-brief">
            <span className="brief-label">Signed in as</span>
            <strong>{userDisplayName}</strong>
            <span className="brief-role">{role.replace("_", " ")}</span>
          </div>
          <div className="hero-actions">
            <Link to="/properties" className="dashboard-button dashboard-button-primary">
              Open Asset Registry
            </Link>
            <Link to="/reports" className="dashboard-button dashboard-button-secondary">
              View Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {loading ? (
          <div className="loading-message">Loading dashboard data...</div>
        ) : error ? (
          <div className="error-message">Error: {error}</div>
        ) : (
          statCards.map((card) => (
            <article className={`stat-card tone-${card.tone}`} key={card.label}>
              <div className="stat-card-top">
                <div className="stat-icon-wrap">
                  <AppIcon name={card.icon} size={18} />
                </div>
                <span className="stat-trend">{card.trend}</span>
              </div>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </article>
          ))
        )}
      </section>

      <section className="dashboard-layout">
        <div className="dashboard-primary">
          <article className="surface-card table-card">
            <div className="section-head">
              <div>
                <span className="section-kicker">Asset Registry</span>
                <h2>Live asset activity table</h2>
              </div>
              <div className="table-actions">
                <label className="filter-pill">
                  <AppIcon name="filter" size={14} />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL" ? "All Statuses" : option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="table-wrap">
              {filteredRows.length === 0 ? (
                <div className="empty-state">
                  <strong>No properties available</strong>
                  <p>Properties you create or can access will appear here.</p>
                </div>
              ) : (
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th><button type="button" onClick={() => handleSort("asset")}>Asset</button></th>
                      <th><button type="button" onClick={() => handleSort("code")}>Code</button></th>
                      <th><button type="button" onClick={() => handleSort("office")}>Location</button></th>
                      <th>Status</th>
                      <th><button type="button" onClick={() => handleSort("owner")}>Responsible</button></th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={`${row.code}-${row.asset}`}>
                        <td>
                          <div className="table-asset">
                            <strong>{row.asset}</strong>
                            <span>{row.code}</span>
                          </div>
                        </td>
                        <td>{row.code}</td>
                        <td>{row.office}</td>
                        <td>
                          <span className={`status-badge tone-${statusToneMap[row.status] || "neutral"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row.owner}</td>
                        <td>{row.channel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </article>

          <div className="content-split">
            <article className="surface-card scan-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Verification Surface</span>
                  <h2>QR and barcode scanning</h2>
                </div>
                <AppIcon name="qr" size={18} />
              </div>
              <div className="scan-grid">
                <div className="scan-visual" aria-hidden="true">
                  <div className="scan-frame">
                    <div className="scan-line" />
                  </div>
                </div>
                <div className="scan-copy">
                  <p>
                    Scan tagged assets, confirm custody, and detect unmatched movement in real time.
                  </p>
                  <div className="mini-stats">
                    <div>
                      <strong>{formatCount(properties.length)}</strong>
                      <span>Visible assets</span>
                    </div>
                    <div>
                      <strong>{formatCount(timelineItems.length)}</strong>
                      <span>Recent events</span>
                    </div>
                  </div>
                  <Link to="/verification" className="dashboard-button dashboard-button-secondary">
                    Open Verification Workspace
                  </Link>
                </div>
              </div>
            </article>

            <article className="surface-card empty-state-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">System Health</span>
                  <h2>Current workspace state</h2>
                </div>
              </div>
              <div className="empty-state">
                <div className="empty-state-illustration">
                  <AppIcon name="sparkle" size={20} />
                </div>
                <strong>{alerts[0]?.title || "No active alerts"}</strong>
                <p>{alerts[0]?.text || "There are no current issues in your visible workspace."}</p>
              </div>
            </article>
          </div>
        </div>

        <aside className="dashboard-secondary">
          <article className="surface-card">
            <div className="section-head">
              <div>
                <span className="section-kicker">Recent Actions</span>
                <h2>Activity timeline</h2>
              </div>
            </div>
            <div className="timeline">
              {loading ? (
                <div className="loading-message">Loading activity...</div>
              ) : timelineItems.length === 0 ? (
                <div className="empty-state">
                  <strong>No recent activity</strong>
                  <p>Recent actions will appear here when new work is recorded.</p>
                </div>
              ) : (
                timelineItems.map((item) => (
                  <div className="timeline-item" key={`${item.title}-${item.time}`}>
                    <div className="timeline-dot" />
                    <div>
                      <div className="timeline-head">
                        <strong>{item.title}</strong>
                        <span>{item.time}</span>
                      </div>
                      <p>{item.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="surface-card">
            <div className="section-head">
              <div>
                <span className="section-kicker">Real-time Alerts</span>
                <h2>Notification panel</h2>
              </div>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <div className={`alert-item tone-${alert.tone}`} key={alert.title}>
                  <strong>{alert.title}</strong>
                  <p>{alert.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card role-card">
            <div className="section-head">
              <div>
                <span className="section-kicker">Role View</span>
                <h2>Workspace privileges</h2>
              </div>
            </div>
            <div className="role-badges">
              <span className="role-badge is-active">{role.replace("_", " ")}</span>
              <span className="role-badge">Live Data</span>
              <span className="role-badge">Search</span>
              <span className="role-badge">Verification</span>
            </div>
            <p>
              This dashboard now reflects live backend data for your visible workspace instead of placeholder registry content.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

export default EnterpriseDashboard;
