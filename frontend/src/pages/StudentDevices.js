import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import "./Enterprise.css";
import "./Assignments.css";

function StudentDevices() {
  const { accessToken, role } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [verifyAction, setVerifyAction] = useState("verify");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitData, setResubmitData] = useState({ serial_number: "", photo_url: null, pc_image_url: null });

  const isOfficer = role === "IT_OFFICER" || role === "SECURITY" || role === "ADMIN";
  const isStudent = role === "STUDENT";

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = isStudent ? "/api/student-devices/my/" : "/api/student-devices/queue/";
      const res = await fetch(apiUrl(endpoint), {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.results || data);
      } else {
        toast.error("Failed to load devices", { position: "top-right", autoClose: 3000 });
      }
    } catch {
      toast.error("Failed to load devices", { position: "top-right", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  }, [accessToken, isStudent]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleVerify = (device) => {
    setSelectedDevice(device);
    setVerifyAction("verify");
    setShowVerifyModal(true);
  };

  const handleReject = (device) => {
    setSelectedDevice(device);
    setVerifyAction("reject");
    setRejectionReason("");
    setShowVerifyModal(true);
  };

  const submitVerification = async () => {
    try {
      const endpoint = verifyAction === "verify"
        ? `/api/student-devices/${selectedDevice.student_device_id}/verify/`
        : `/api/student-devices/${selectedDevice.student_device_id}/reject/`;
      const body = verifyAction === "reject" ? { rejection_reason: rejectionReason } : {};
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Device ${verifyAction === "verify" ? "verified" : "rejected"} successfully`, { position: "top-right", autoClose: 3000 });
        setShowVerifyModal(false);
        setRejectionReason("");
        fetchDevices();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed", { position: "top-right", autoClose: 3000 });
      }
    } catch {
      toast.error("Failed to process verification", { position: "top-right", autoClose: 3000 });
    }
  };

  // UC-07 Step 13: Resubmit rejected device
  const openResubmitModal = (device) => {
    setSelectedDevice(device);
    setResubmitData({ serial_number: device.serial_number_submitted, photo_url: null, pc_image_url: null });
    setShowResubmitModal(true);
  };

  const submitResubmission = async () => {
    try {
      const payload = new FormData();
      if (resubmitData.serial_number) payload.append("serial_number_submitted", resubmitData.serial_number);
      if (resubmitData.photo_url) payload.append("photo_url", resubmitData.photo_url);
      if (resubmitData.pc_image_url) payload.append("pc_image_url", resubmitData.pc_image_url);

      const res = await fetch(apiUrl(`/api/student-devices/${selectedDevice.student_device_id}/resubmit/`), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: payload,
      });
      if (res.ok) {
        toast.success("Device resubmitted for cross-check verification", { position: "top-right", autoClose: 4000 });
        setShowResubmitModal(false);
        fetchDevices();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed", { position: "top-right", autoClose: 3000 });
      }
    } catch {
      toast.error("Failed to resubmit", { position: "top-right", autoClose: 3000 });
    }
  };

  const getStatusColor = (s) => {
    if (s === "Pending") return "status-warning";
    if (s === "Verified") return "status-success";
    if (s === "Rejected") return "status-danger";
    return "status-neutral";
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() + " " + new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>{isStudent ? "My Devices" : "Student Device Cross-Check Queue"}</h2>
            <p>{isStudent ? "Track your registered device verification status" : "Review and verify student device registrations"}</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><div className="loading-spinner"></div><p>Loading devices...</p></div>
        ) : devices.length === 0 ? (
          <div className="no-results"><h3>No devices found</h3><p>{isStudent ? "You have not registered any devices yet." : "No pending devices in the cross-check queue."}</p></div>
        ) : (
          <div className="assignments-table">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student ID</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Serial Number</th>
                  <th>Profile Photo</th>
                  <th>Device Photo</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.student_device_id}>
                    <td><strong>{device.student_name || "N/A"}</strong></td>
                    <td>{device.student_id_number}</td>
                    <td>{device.department_name || "N/A"}</td>
                    <td>{device.year_of_study || "N/A"}</td>
                    <td><strong>{device.serial_number_submitted}</strong></td>
                    <td>
                      {device.photo_url ? (
                        <a href={device.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={device.photo_url} alt="Profile" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                        </a>
                      ) : <small>No photo</small>}
                    </td>
                    <td>
                      {device.pc_image_url ? (
                        <a href={device.pc_image_url} target="_blank" rel="noopener noreferrer">
                          <img src={device.pc_image_url} alt="Device" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                        </a>
                      ) : <small>No image</small>}
                    </td>
                    <td><span className={`status-badge ${getStatusColor(device.verification_status)}`}>{device.verification_status}</span></td>
                    <td><small>{fmtDate(device.submitted_at)}</small></td>
                    <td>
                      <div className="action-buttons">
                        {isOfficer && device.verification_status === "Pending" && (
                          <>
                            <button className="btn-small btn-success" onClick={() => handleVerify(device)}>Verify</button>
                            <button className="btn-small btn-danger" onClick={() => handleReject(device)}>Reject</button>
                          </>
                        )}
                        {isStudent && device.verification_status === "Rejected" && (
                          <button className="btn-small btn-primary" onClick={() => openResubmitModal(device)}>Resubmit</button>
                        )}
                        {isStudent && device.verification_status === "Rejected" && device.rejection_reason && (
                          <small style={{ color: "#991b1b" }} title={device.rejection_reason}>
                            Reason: {device.rejection_reason.length > 25 ? device.rejection_reason.substring(0, 25) + "..." : device.rejection_reason}
                          </small>
                        )}
                        {device.verification_status === "Verified" && <small style={{ color: "#166534" }}>Verified</small>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verify/Reject Modal with photo comparison for IT Officer (Step 10) */}
      {showVerifyModal && selectedDevice && (
        <div className="form-overlay">
          <div className="form-modal" style={{ maxWidth: 600 }}>
            <h3>{verifyAction === "verify" ? "Verify Device" : "Reject Device"}</h3>
            <div className="transfer-details">
              <p><strong>Student:</strong> {selectedDevice.student_name}</p>
              <p><strong>Student ID:</strong> {selectedDevice.student_id_number}</p>
              <p><strong>Serial Number:</strong> {selectedDevice.serial_number_submitted}</p>
            </div>
            {/* Step 10: Show photos for physical comparison */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {selectedDevice.photo_url && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 600, marginBottom: 4, display: "block" }}>Profile Photo</label>
                  <img src={selectedDevice.photo_url} alt="Profile" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </div>
              )}
              {selectedDevice.pc_image_url && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 600, marginBottom: 4, display: "block" }}>Device / Serial Label Photo</label>
                  <img src={selectedDevice.pc_image_url} alt="Device" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </div>
              )}
            </div>
            {verifyAction === "reject" && (
              <div className="form-group">
                <label>Rejection Reason *</label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Enter the reason for rejecting this device registration" rows={3} required />
              </div>
            )}
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowVerifyModal(false); setRejectionReason(""); }}>Cancel</button>
              <button className={verifyAction === "verify" ? "btn-primary btn-success" : "btn-primary btn-danger"} onClick={submitVerification}>
                {verifyAction === "verify" ? "Verify Device" : "Reject Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 13: Resubmit modal for rejected devices */}
      {showResubmitModal && selectedDevice && (
        <div className="form-overlay">
          <div className="form-modal">
            <h3>Resubmit Device Registration</h3>
            {selectedDevice.rejection_reason && (
              <div className="transfer-details" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
                <p><strong>Rejection Reason:</strong> {selectedDevice.rejection_reason}</p>
              </div>
            )}
            <div className="form-group">
              <label>Serial Number</label>
              <input type="text" value={resubmitData.serial_number} onChange={(e) => setResubmitData((p) => ({ ...p, serial_number: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Updated Profile Photo (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setResubmitData((p) => ({ ...p, photo_url: e.target.files[0] || null }))} />
            </div>
            <div className="form-group">
              <label>Updated Device Photo (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setResubmitData((p) => ({ ...p, pc_image_url: e.target.files[0] || null }))} />
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowResubmitModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={submitResubmission}>Resubmit for Verification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDevices;
