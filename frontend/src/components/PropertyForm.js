import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./PropertyForm.css";

function extractErrorMessage(body) {
  if (!body) {
    return "Failed to create property.";
  }

  if (typeof body === "string") {
    return body;
  }

  if (typeof body.detail === "string") {
    return body.detail;
  }

  for (const value of Object.values(body)) {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      if (typeof firstItem === "string") {
        return firstItem;
      }
    }
  }

  return "Failed to create property.";
}

function PropertyForm({ onCreated }) {
  const { accessToken, refreshAccessToken, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    category: "",
    model: "",
    serial_number: "",
    value: "",
    department: "",
    location: "",
    description: "",
    status: "REGISTERED",
    condition: "GOOD",
    purchase_year: "2026",
    approval_status: "PENDING"
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => {
    return (
      formData.name.trim() &&
      formData.category.trim() &&
      formData.serial_number.trim() &&
      formData.department.trim()
    );
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setSuccess("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    setError("");
    setSuccess("");
    setImageFile(event.target.files?.[0] || null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      category: "",
      model: "",
      serial_number: "",
      value: "",
      department: "",
      location: "",
      description: "",
      status: "REGISTERED",
      condition: "GOOD",
      purchase_year: "2026",
      approval_status: "PENDING"
    });
    setImageFile(null);
  };

  const submitProperty = async (token) => {
    const payload = new FormData();
    payload.append("name", formData.name.trim());
    payload.append("title", formData.title.trim() || formData.name.trim());
    payload.append("category", formData.category.trim());
    payload.append("model", formData.model.trim());
    payload.append("serial_number", formData.serial_number.trim());
    payload.append("value", formData.value || "0");
    payload.append("department", formData.department.trim());
    payload.append("location", formData.location.trim());
    payload.append("description", formData.description.trim());
    payload.append("status", formData.status);
    payload.append("condition", formData.condition);
    payload.append("purchase_year", formData.purchase_year);
    payload.append("approval_status", formData.approval_status);
    if (imageFile) {
      payload.append("image", imageFile);
    }

    return fetch(apiUrl("/api/properties/"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Please fill all fields and upload an image.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      let token = accessToken;
      let response = await submitProperty(token);

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          logout();
          throw new Error("Your session has expired. Please sign in again.");
        }

        token = localStorage.getItem("accessToken") || "";
        response = await submitProperty(token);
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(body));
      }

      const created = await response.json();
      setSuccess("Property created successfully.");
      resetForm();
      if (onCreated) {
        onCreated(created);
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to create property.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="property-form-card">
      <div className="property-form-header">
        <h2>Add Property</h2>
        <p>Create a new property record with all details.</p>
      </div>

      <form className="property-modern-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            type="text"
            name="name"
            placeholder="Property Name *"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={formData.title}
            onChange={handleChange}
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            name="category"
            placeholder="Category *"
            value={formData.category}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="model"
            placeholder="Model"
            value={formData.model}
            onChange={handleChange}
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            name="serial_number"
            placeholder="Serial Number *"
            value={formData.serial_number}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="department"
            placeholder="Department *"
            value={formData.department}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-row">
          <input
            type="number"
            min="0"
            step="0.01"
            name="value"
            placeholder="Asset Value"
            value={formData.value}
            onChange={handleChange}
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
          />
          <input
            type="number"
            name="purchase_year"
            placeholder="Purchase Year"
            value={formData.purchase_year}
            onChange={handleChange}
            min="1900"
            max="2100"
          />
        </div>
        <div className="form-row">
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="REGISTERED">Registered</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="DAMAGED">Damaged</option>
            <option value="LOST">Lost</option>
          </select>
          <select
            name="condition"
            value={formData.condition}
            onChange={handleChange}
          >
            <option value="NEW">New</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
          </select>
        </div>
        <div className="form-row">
          <select
            name="approval_status"
            value={formData.approval_status}
            onChange={handleChange}
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
        />
        <div className="form-group">
          <label>Property Image (Optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create Property"}
        </button>
      </form>

      {error && <p className="form-error-text">{error}</p>}
      {success && <p className="form-success-text">{success}</p>}
    </div>
  );
}

export default PropertyForm;
