import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "../utils/toast";
import { apiUrl } from "../config/api";
import "./Enterprise.css";
import "./Assignments.css";

function Incidents() {
  const { accessToken, user, role } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState({
    property: "",
    incident_type: "",
    incident_date: "",
    location: "",
    description: "",
    attachment: null,
  });
  const [filter, setFilter] = useState({ status: "all", type: "all" });

  const canManage = role === "ADMIN" || role === "PROPERTY_OFFICER" || role === "DEPT_HEAD";
  const canReport = role === "STAFF" || role === "STUDENT" || role === "ADMIN";

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams();
      if (filter.status !== "all") qp.append("status", filter.status);
      if (filter.type !== "all") qp.append("incident_type", filter.type);
      const res = await fetch(apiUrl(`/api/incidents/?${qp}`), {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setIncidents(data.results || data);
    } catch {
      toast.error("Failed to load incidents", { position: "top-right", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter.status, filter.type]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // UC-06 Step 4: Fetch assigned properties for the user
  const fetchAssignedProperties = useCallback(async () => {
    if (!canReport) return;
    try {
      const res = await fetch(apiUrl("/api/properties/?status=ASSIGNED"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssignedProperties(data.results || data);
    } catch {
      toast.error("Failed to load properties", { position: "top-right", autoClose: 3000 });
    }
  }, [accessToken, canReport]);

  // UC-06 Step 4: Search property by name or serial number
  const searchProperties = useCallback(async (query) => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(apiUrl(`/api/properties/?search=${encodeURIComponent(query)}`), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSearchResults(data.results || data);
    } catch {
      setSearchResults([]);
    }
  }, [accessToken]);

  // UC-06 Step 1: User selects "Report Incident"
  const openReportForm = () => {
    setShowForm(true);
    setFormData({ property: "", incident_type: "", incident_date: "", location: "", description: "", attachment: null });
    setSearchQuery(""); setSearchResults([]);
    fetchAssignedProperties();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, attachment: e.target.files[0] || null }));
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    searchProperties(q);
  };

  const selectProperty = (propId) => {
    setFormData((prev) => ({ ...prev, property: propId }));
    setSearchQuery(""); setSearchResults([]);
  };

  // UC-06 Step 7: User submits the report
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.property || !formData.incident_type || !formData.incident_date || !formData.location.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields", { position: "top-right", autoClose: 4000 });
      return;
    }
    try {
      setSubmitting(true);
      // Use FormData for file upload support (Step 6)
      const payload = new FormData();
      payload.append("property", formData.property);
      payload.append("incident_type", formData.incident_type);
      payload.append("incident_date", formData.incident_date);
      payload.append("location", formData.location.trim());
      payload.append("description", formData.description.trim());
      if (formData.attachment) payload.append("attachment", formData.attachment);

      const res = await fetch(apiUrl("/api/incidents/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: payload,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.property?.join(" ") || err.incident_type?.join(" ") || "Failed to submit");
      }
      toast.success("Incident reported successfully. Property status updated to Under Investigation.", { position: "top-right", autoClose: 4000 });
      setShowForm(false);
      setFormData({ property: "", incident_type: "", incident_date: "", location: "", description: "", attachment: null });
      fetchIncidents();
    } catch (error) {
      toast.error(error.message, { position: "top-right", autoClose: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  // Status update via the status action endpoint
  const updateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const res = await fetch(apiUrl(`/api/incidents/${incidentId}/status/`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      toast.success("Incident status updated", { position: "top-right", autoClose: 3000 });
      fetchIncidents();
    } catch (error) {
      toast.error(error.message, { position: "top-right", autoClose: 3000 });
    }
  };

  // Resolve incident
  const resolveIncident = async (incidentId) => {
    try {
      const res = await fetch(apiUrl(`/api/incidents/${incidentId}/resolve/`), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      toast.success("Incident resolved. Property status updated.", { position: "top-right", autoClose: 4000 });
      fetchIncidents();
    } catch (error) {
      toast.error(error.message, { position: "top-right", autoClose: 3000 });
    }
  };

  const getStatusColor = (s) => {
    if (s === "Open") return "status-danger";
    if (s === "Under Investigation") return "status-warning";
    if (s === "Resolved") return "status-success";
    if (s === "Closed") return "status-neutral";
    return "status-neutral";
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Report Incident</h2>
            <p>Report and track property incidents</p>
          </div>
          <div className="assignment-controls">
            {canReport && <button className="btn-primary" onClick={openReportForm}>Report Incident</button>}
          </div>
        </div>

        <div className="incident-filters">
          <div className="filter-controls">
            <select name="status" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <select name="type" value={filter.type} onChange={(e) => setFilter((p) => ({ ...p, type: e.target.value }))}>
              <option value="all">All Types</option>
              <option value="Lost">Lost</option>
              <option value="Stolen">Stolen</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="loading-spinner"></div><p>Loading incidents...</p></div>
        ) : incidents.length === 0 ? (
          <div className="no-results"><h3>No incidents found</h3><p>No incidents match the current filters.</p></div>
        ) : (
          <div className="incidents-table">
            <table className="list-table">
              <thead>
                <tr><th>Tracking #</th><th>Property</th><th>Type</th><th>Status</th><th>Incident Date</th><th>Location</th><th>Reported By</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.incident_id}>
                    <td><strong>{incident.tracking_number}</strong></td>
                    <td><strong>{incident.property_title || `Property #${incident.property}`}</strong></td>
                    <td><span className={`status-badge ${incident.incident_type === "Lost" ? "status-warning" : incident.incident_type === "Stolen" ? "status-danger" : "status-neutral"}`}>{incident.incident_type}</span></td>
                    <td><span className={`status-badge ${getStatusColor(incident.status)}`}>{incident.status}</span></td>
                    <td><small>{incident.incident_date}</small></td>
                    <td><small>{incident.location}</small></td>
                    <td>{incident.reported_by_name || "Unknown"}</td>
                    <td>
                      <div className="action-buttons">
                        {incident.status === "Open" && canManage && (
                          <button className="btn-small btn-warning" onClick={() => updateIncidentStatus(incident.incident_id, "Under Investigation")}>Investigate</button>
                        )}
                        {incident.status === "Under Investigation" && canManage && (
                          <button className="btn-small btn-success" onClick={() => resolveIncident(incident.incident_id)}>Resolve</button>
                        )}
                        {incident.status === "Resolved" && canManage && (
                          <button className="btn-small btn-secondary" onClick={() => updateIncidentStatus(incident.incident_id, "Closed")}>Close</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UC-06 Step 2-6: Report Incident Form Modal */}
      {showForm && (
        <div className="form-overlay">
          <div className="form-modal" style={{ maxWidth: 600 }}>
            <h3>Report Incident</h3>
            <form onSubmit={handleSubmit}>
              {/* Step 3: Select incident type */}
              <div className="form-group">
                <label>Incident Type *</label>
                <select name="incident_type" value={formData.incident_type} onChange={handleInputChange} required>
                  <option value="">-- Select incident type --</option>
                  <option value="Lost">Lost</option>
                  <option value="Stolen">Stolen</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              {/* Step 4: Select affected property from assigned items or search */}
              <div className="form-group">
                <label>Affected Property *</label>
                <select name="property" value={formData.property} onChange={handleInputChange} required>
                  <option value="">-- Select from your assigned properties --</option>
                  {assignedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.title || p.name} (SN: {p.serial_number || "N/A"})</option>
                  ))}
                </select>
                <small style={{ color: "#64748b", marginTop: 4, display: "block" }}>Or search by name or serial number:</small>
                <input
                  type="text"
                  placeholder="Search by name or serial number..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{ marginTop: 4 }}
                />
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 4, maxHeight: 120, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                    {searchResults.map((p) => (
                      <div key={p.id} onClick={() => selectProperty(p.id)} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                        <strong>{p.title || p.name}</strong> <small>(SN: {p.serial_number || "N/A"}) - {p.status}</small>
                      </div>
                    ))}
                  </div>
                )}
                {formData.property && (
                  <small style={{ color: "#166534", marginTop: 4, display: "block" }}>Selected property ID: {formData.property}</small>
                )}
              </div>

              {/* Step 5: Incident date, location, description */}
              <div className="form-group">
                <label>Incident Date *</label>
                <input type="date" name="incident_date" value={formData.incident_date} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="Where did the incident occur?" required />
              </div>
              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea name="description" rows={3} value={formData.description} onChange={handleInputChange} placeholder="Describe the incident in detail" required />
              </div>

              {/* Step 6: Attach supporting evidence (optional) */}
              <div className="form-group">
                <label>Supporting Evidence (optional)</label>
                <input type="file" name="attachment" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
                <small style={{ color: "#64748b", marginTop: 4, display: "block" }}>Photographs or documents supporting the incident report</small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incidents;
