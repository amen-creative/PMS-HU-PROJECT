import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "../utils/toast";
import { apiUrl } from "../config/api";
import "./Enterprise.css";
import "./Assignments.css";

function Transfers() {
  const { accessToken, user, role } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: "all" });
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [transferForm, setTransferForm] = useState({ property: "", to_user: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const canManage = role === "ADMIN" || role === "PROPERTY_OFFICER";
  const isDeptHead = role === "DEPT_HEAD";

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const qp = new URLSearchParams();
      if (filter.status !== "all") qp.append("status", filter.status);
      const res = await fetch(apiUrl(`/api/transfers/?${qp}`), {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTransfers(data.results || data);
    } catch { toast.error("Failed to load transfers", { position: "top-right", autoClose: 3000 }); }
    finally { setLoading(false); }
  }, [accessToken, filter.status]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const fetchAssignedProperties = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await fetch(apiUrl("/api/properties/?status=ASSIGNED"), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssignedProperties(data.results || data);
    } catch { toast.error("Failed to load properties", { position: "top-right", autoClose: 3000 }); }
  }, [accessToken, canManage]);

  const fetchUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await fetch(apiUrl("/api/users/"), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.results || data);
    } catch { toast.error("Failed to load users", { position: "top-right", autoClose: 3000 }); }
  }, [accessToken, canManage]);

  const openTransferForm = () => {
    setShowTransferForm(true); setTransferForm({ property: "", to_user: "", reason: "" });
    setSelectedProperty(null); fetchAssignedProperties(); fetchUsers();
  };

  const handlePropertySelect = (propertyId) => {
    const prop = assignedProperties.find((p) => p.id === parseInt(propertyId));
    setSelectedProperty(prop || null);
    setTransferForm((prev) => ({ ...prev, property: propertyId, to_user: "" }));
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.property || !transferForm.to_user || !transferForm.reason.trim()) {
      toast.error("Please fill in all required fields", { position: "top-right", autoClose: 4000 }); return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(apiUrl("/api/transfers/"), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ property: parseInt(transferForm.property), to_user: parseInt(transferForm.to_user), reason: transferForm.reason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.property?.join(" ") || err.to_user?.join(" ") || err.reason?.join(" ") || "Failed");
      }
      toast.success("Transfer request submitted. Pending Dept Head approval.", { position: "top-right", autoClose: 4000 });
      setShowTransferForm(false); setSelectedProperty(null);
      setTransferForm({ property: "", to_user: "", reason: "" }); fetchTransfers();
    } catch (error) { toast.error(error.message, { position: "top-right", autoClose: 5000 }); }
    finally { setSubmitting(false); }
  };

  const approveTransfer = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/transfers/${id}/approve/`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ response_note: "Approved" }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      toast.success("Transfer approved. Ownership updated.", { position: "top-right", autoClose: 4000 });
      fetchTransfers();
    } catch (error) { toast.error(error.message, { position: "top-right", autoClose: 4000 }); }
  };

  const openRejectModal = (t) => { setRejectTarget(t); setRejectReason(""); setShowRejectModal(true); };

  const submitRejection = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason", { position: "top-right", autoClose: 3000 }); return; }
    try {
      const res = await fetch(apiUrl(`/api/transfers/${rejectTarget.id}/reject/`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ response_note: rejectReason.trim() }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      toast.success("Transfer rejected. Officer notified.", { position: "top-right", autoClose: 4000 });
      setShowRejectModal(false); setRejectTarget(null); setRejectReason(""); fetchTransfers();
    } catch (error) { toast.error(error.message, { position: "top-right", autoClose: 4000 }); }
  };

  const getStatusColor = (s) => {
    if (s === "PENDING") return "status-warning";
    if (s === "COMPLETED" || s === "APPROVED") return "status-success";
    if (s === "REJECTED") return "status-danger";
    return "status-neutral";
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";
  const filtered = filter.status === "all" ? transfers : transfers.filter((t) => t.status === filter.status);

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Transfer Property</h2>
            <p>Request, approve, and track property transfer workflow</p>
          </div>
          <div className="assignment-controls">
            {canManage && <button className="btn-primary" onClick={openTransferForm}>Transfer Property</button>}
          </div>
        </div>

        <div className="assignment-filters">
          <div className="filter-controls">
            <select value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="loading-spinner"></div><p>Loading transfers...</p></div>
        ) : filtered.length === 0 ? (
          <div className="no-results"><h3>No transfers found</h3><p>No transfer requests match the current filter.</p></div>
        ) : (
          <div className="assignments-table">
            <table className="list-table">
              <thead>
                <tr><th>ID</th><th>Property</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Requested</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td><strong>#{t.id}</strong></td>
                    <td><strong>{t.property_name || `Property #${t.property}`}</strong></td>
                    <td>{t.from_username || "N/A"}</td>
                    <td>{t.to_username || "N/A"}</td>
                    <td><small>{t.reason || "No reason"}</small></td>
                    <td><span className={`status-badge ${getStatusColor(t.status)}`}>{t.status}</span></td>
                    <td><small>{fmtDate(t.created_at)}</small></td>
                    <td>
                      <div className="action-buttons">
                        {t.status === "PENDING" && isDeptHead && (
                          <>
                            <button className="btn-small btn-success" onClick={() => approveTransfer(t.id)}>Approve</button>
                            <button className="btn-small btn-danger" onClick={() => openRejectModal(t)}>Reject</button>
                          </>
                        )}
                        {t.status === "PENDING" && canManage && <small style={{ color: "#64748b" }}>Awaiting Dept Head</small>}
                        {t.status === "COMPLETED" && <small style={{ color: "#166534" }}>Completed</small>}
                        {t.status === "REJECTED" && t.response_note && (
                          <small style={{ color: "#991b1b" }} title={t.response_note}>
                            Rejected: {t.response_note.length > 30 ? t.response_note.substring(0, 30) + "..." : t.response_note}
                          </small>
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

      {/* UC-04 Step 1-4: Transfer Property Form Modal */}
      {showTransferForm && (
        <div className="form-overlay">
          <div className="form-modal" style={{ maxWidth: 600 }}>
            <h3>Transfer Property</h3>
            {selectedProperty && (
              <div className="transfer-details">
                <p><strong>Property:</strong> {selectedProperty.title || selectedProperty.name}</p>
                <p><strong>Serial Number:</strong> {selectedProperty.serial_number || "N/A"}</p>
                <p><strong>Current Owner:</strong> {selectedProperty.owner_username || selectedProperty.owner_name || "N/A"}</p>
                <p><strong>Current Assignee:</strong> {selectedProperty.assignee_username || selectedProperty.current_assignee_name || "N/A"}</p>
                <p><strong>Department:</strong> {selectedProperty.department || "N/A"}</p>
                <p><strong>Status:</strong> {selectedProperty.status}</p>
              </div>
            )}
            <form onSubmit={submitTransfer}>
              <div className="form-group">
                <label>Select Property *</label>
                <select name="property" value={transferForm.property} onChange={(e) => handlePropertySelect(e.target.value)} required>
                  <option value="">-- Select an assigned property --</option>
                  {assignedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.title || p.name} (SN: {p.serial_number || "N/A"}) - {p.department || "No Dept"}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Transfer To (New Owner) *</label>
                <select name="to_user" value={transferForm.to_user} onChange={(e) => setTransferForm((prev) => ({ ...prev, to_user: e.target.value }))} required>
                  <option value="">-- Select new owner --</option>
                  {users.filter((u) => u.is_active && u.id !== (selectedProperty?.owner || selectedProperty?.current_assignee)).map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username} - {u.role} ({u.department || "No Dept"})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason for Transfer *</label>
                <textarea name="reason" value={transferForm.reason} onChange={(e) => setTransferForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Enter the reason for this property transfer" rows={3} required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTransferForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit Transfer Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alt course: Rejection modal with reason */}
      {showRejectModal && rejectTarget && (
        <div className="form-overlay">
          <div className="form-modal">
            <h3>Reject Transfer #{rejectTarget.id}</h3>
            <div className="transfer-details">
              <p><strong>Property:</strong> {rejectTarget.property_name || `Property #${rejectTarget.property}`}</p>
              <p><strong>From:</strong> {rejectTarget.from_username}</p>
              <p><strong>To:</strong> {rejectTarget.to_username}</p>
            </div>
            <div className="form-group">
              <label>Rejection Reason *</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter the reason for rejecting this transfer" rows={3} required />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>Cancel</button>
              <button className="btn-danger" onClick={submitRejection}>Reject Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transfers;
