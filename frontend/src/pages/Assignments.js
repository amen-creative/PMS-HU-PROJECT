import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "../utils/toast";
import { apiUrl } from "../config/api";
import "./Enterprise.css";
import "./Assignments.css";

function Assignments() {
  const { accessToken, user, role } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: "all",
    department: "all"
  });
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [transferForm, setTransferForm] = useState({
    new_user_id: "",
    notes: ""
  });
  const [realtimeUpdates, setRealtimeUpdates] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filter.status !== "all") queryParams.append('status', filter.status);
      if (filter.department !== "all") queryParams.append('department', filter.department);

      const response = await fetch(apiUrl(`/api/assignments/?${queryParams}`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }

      const data = await response.json();
      setAssignments(data.results || []);
    } catch (error) {
      toast.error("Failed to load assignments", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Real-time updates with polling
  useEffect(() => {
    if (!realtimeUpdates) return;

    const interval = setInterval(() => {
      fetchAssignments();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [realtimeUpdates, fetchAssignments]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const initiateTransfer = (assignment) => {
    setSelectedAssignment(assignment);
    setShowTransferForm(true);
    setTransferForm({
      new_user_id: "",
      notes: ""
    });
  };

  const handleTransferChange = (e) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    
    if (!selectedAssignment || !transferForm.new_user_id) {
      toast.error("Please select a user to transfer to", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/assignments/${selectedAssignment.id}/transfer/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          new_user_id: transferForm.new_user_id,
          notes: transferForm.notes,
          initiated_by: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to initiate transfer");
      }

      const updatedAssignment = await response.json();
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === selectedAssignment.id 
            ? updatedAssignment
            : assignment
        )
      );

      toast.success("Transfer initiated successfully", {
        position: "top-right",
        autoClose: 3000,
      });

      setShowTransferForm(false);
      setSelectedAssignment(null);
      setTransferForm({ new_user_id: "", notes: "" });
    } catch (error) {
      toast.error(error.message || "Failed to initiate transfer", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const acceptTransfer = async (assignmentId) => {
    try {
      const response = await fetch(apiUrl(`/api/assignments/${assignmentId}/accept/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accepted_by: user.id
        })
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === assignmentId 
              ? updatedAssignment
              : assignment
          )
        );

        toast.success("Transfer accepted successfully", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        throw new Error("Failed to accept transfer");
      }
    } catch (error) {
      toast.error("Failed to accept transfer", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const rejectTransfer = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to reject this transfer?")) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/assignments/${assignmentId}/reject/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rejected_by: user.id
        })
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.id === assignmentId 
              ? updatedAssignment
              : assignment
          )
        );

        toast.success("Transfer rejected successfully", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        throw new Error("Failed to reject transfer");
      }
    } catch (error) {
      toast.error("Failed to reject transfer", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ASSIGNED': return 'status-success';
      case 'PENDING_TRANSFER': return 'status-warning';
      case 'TRANSFERRED': return 'status-neutral';
      case 'RETURNED': return 'status-danger';
      default: return 'status-neutral';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Assignments</h2>
            <p>Track assignment lifecycle and handover status</p>
          </div>
          <div className="assignment-controls">
            {(role === "ADMIN" || role === "PROPERTY_OFFICER") && (
              <Link className="btn-primary" to="/assignments/create">
                Create Assignment
              </Link>
            )}
            <button
              className={`btn-toggle ${realtimeUpdates ? 'active' : ''}`}
              onClick={() => setRealtimeUpdates(!realtimeUpdates)}
            >
              {realtimeUpdates ? '🔴 Live Updates' : '⚪ Enable Live Updates'}
            </button>
          </div>
        </div>

        <div className="assignment-filters">
          <div className="filter-controls">
            <select name="status" value={filter.status} onChange={handleFilterChange}>
              <option value="all">All Status</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PENDING_TRANSFER">Pending Transfer</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="RETURNED">Returned</option>
            </select>
            <select name="department" value={filter.department} onChange={handleFilterChange}>
              <option value="all">All Departments</option>
              <option value="IT">IT</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Library">Library</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="no-results">
            <h3>No assignments found</h3>
            <p>No assignments match the current filters.</p>
          </div>
        ) : (
          <div className="assignments-table">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Assigned To</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Assigned Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <strong>{assignment.property_id}</strong>
                      {assignment.property_name && (
                        <small>{assignment.property_name}</small>
                      )}
                      {assignment.serial_number && (
                        <small>SN: {assignment.serial_number}</small>
                      )}
                    </td>
                    <td>
                      <strong>{assignment.assigned_to_name || 'Unknown'}</strong>
                      <small>{assignment.assigned_to_email}</small>
                    </td>
                    <td>
                      <span className="department-badge">{assignment.department}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <small>{formatDate(assignment.assigned_at)}</small>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {assignment.status === 'ASSIGNED' && (
                          <button
                            className="btn-small btn-primary"
                            onClick={() => initiateTransfer(assignment)}
                          >
                            Transfer
                          </button>
                        )}
                        {assignment.status === 'PENDING_TRANSFER' && assignment.pending_transfer_to === user.id && (
                          <>
                            <button
                              className="btn-small btn-success"
                              onClick={() => acceptTransfer(assignment.id)}
                            >
                              Accept
                            </button>
                            <button
                              className="btn-small btn-danger"
                              onClick={() => rejectTransfer(assignment.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transfer Form Modal */}
        {showTransferForm && selectedAssignment && (
          <div className="form-overlay">
            <div className="form-modal">
              <h3>Initiate Transfer</h3>
              <div className="transfer-details">
                <p><strong>Property:</strong> {selectedAssignment.property_id}</p>
                <p><strong>Current Assignee:</strong> {selectedAssignment.assigned_to_name}</p>
              </div>
              <form onSubmit={submitTransfer}>
                <div className="form-group">
                  <label>Transfer To (User ID or Email)</label>
                  <input
                    name="new_user_id"
                    type="text"
                    value={transferForm.new_user_id}
                    onChange={handleTransferChange}
                    placeholder="Enter user ID or email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Transfer Notes</label>
                  <textarea
                    name="notes"
                    value={transferForm.notes}
                    onChange={handleTransferChange}
                    placeholder="Add any notes about this transfer"
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowTransferForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Initiate Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Assignments;