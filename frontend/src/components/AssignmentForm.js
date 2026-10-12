import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./AssignmentForm.css";

function AssignmentForm({ onCreated }) {
  const { accessToken } = useAuth();
  const [formData, setFormData] = useState({
    property: "",
    assigned_to: "",
    assigned_department: "",
    notes: ""
  });
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProperties = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(apiUrl("/api/users/"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchUsers();
  }, [accessToken]);

  const canSubmit = useMemo(() => {
    return formData.property && (formData.assigned_to || formData.assigned_department);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setSuccess("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      property: "",
      assigned_to: "",
      assigned_department: "",
      notes: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please select a property and either a user or department.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        property: formData.property,
        notes: formData.notes
      };

      if (formData.assigned_to) {
        payload.assigned_to = formData.assigned_to;
      }
      if (formData.assigned_department) {
        payload.assigned_department = formData.assigned_department;
      }

      const response = await fetch(apiUrl("/api/assignments/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || body?.property?.[0] || body?.assigned_to?.[0] || "Failed to create assignment.");
      }

      const created = await response.json();
      setSuccess("Assignment created successfully.");
      resetForm();
      if (onCreated) {
        onCreated(created);
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to create assignment.");
    } finally {
      setLoading(false);
    }
  };

  const availableProperties = properties.filter(p => p.status !== "ASSIGNED");

  return (
    <div className="assignment-form-card">
      <div className="assignment-form-header">
        <h2>Create Assignment</h2>
        <p>Assign a property to a user or department.</p>
      </div>

      <form className="assignment-modern-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="property">Property *</label>
          <select
            id="property"
            name="property"
            value={formData.property}
            onChange={handleChange}
            required
          >
            <option value="">Select a Property</option>
            {availableProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title || property.name || `Property ${property.id}`} - {property.serial_number || "No SN"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assigned_to">Assign to User</label>
          <select
            id="assigned_to"
            name="assigned_to"
            value={formData.assigned_to}
            onChange={handleChange}
          >
            <option value="">Select a User (Optional)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} - {user.role} - {user.department || "No Dept"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assigned_department">Or Assign to Department</label>
          <select
            id="assigned_department"
            name="assigned_department"
            value={formData.assigned_department}
            onChange={handleChange}
          >
            <option value="">Select a Department (Optional)</option>
            <option value="IT">IT</option>
            <option value="Finance">Finance</option>
            <option value="HR">HR</option>
            <option value="Library">Library</option>
            <option value="Lab">Lab</option>
            <option value="Engineering">Engineering</option>
            <option value="Science">Science</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any notes about this assignment"
            rows={4}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Assignment"}
        </button>
      </form>

      {error && <p className="form-error-text">{error}</p>}
      {success && <p className="form-success-text">{success}</p>}
    </div>
  );
}

export default AssignmentForm;
