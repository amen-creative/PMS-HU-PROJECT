import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { absoluteUrl, apiUrl } from "../config/api";
import "./Properties.css";

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function Properties() {
  const { accessToken, role, user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    department: "",
    status: ""
  });

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(apiUrl("/api/properties/"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load properties.");
      }

      const data = await response.json();
      setProperties(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message || "Unable to fetch properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [accessToken]);

  const visibleProperties = useMemo(() => {
    const scoped = role !== "USER" ? properties : properties.filter((property) => {
      const owner = property.created_by_username || property.created_by_details?.username;
      return owner && owner === user?.username;
    });

    return scoped.filter((property) => {
      const matchesSearch = `${property.title || property.name || ""} ${property.serial_number || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory = !filters.category || (property.category || "").toLowerCase().includes(filters.category.toLowerCase());
      const matchesDepartment = !filters.department || (property.department || "").toLowerCase().includes(filters.department.toLowerCase());
      const matchesStatus = !filters.status || (property.status || "").toLowerCase() === filters.status.toLowerCase();
      return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
    });
  }, [filters.category, filters.department, filters.status, properties, role, search, user?.username]);

  const canManageAll = role === "ADMIN";
  const canCreate = ["ADMIN", "STAFF", "PROPERTY_OFFICER"].includes(role);

  const resolveResponsibleUser = (property) =>
    property.assignee_username ||
    property.owner_username ||
    property.created_by_username ||
    property.created_by_details?.username ||
    "N/A";

  const handleDelete = async (id) => {
    if (!canManageAll) {
      return;
    }
    const isConfirmed = window.confirm("Are you sure you want to delete this property?");
    if (!isConfirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(apiUrl(`/api/properties/${id}/delete/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Unable to delete property.");
      }

      setProperties((prevProperties) => prevProperties.filter((property) => property.id !== id));
      setSuccessMessage("Property deleted successfully.");
    } catch (error) {
      setError(error.message || "Failed to delete property.");
    }
  };

  return (
    <div className="properties-page">
      <div className="properties-card">
        <div className="properties-header">
          <div>
            <h2>Properties</h2>
            <p>View and manage property assets including QR access.</p>
          </div>
          {canCreate && (
            <Link className="add-property-link" to="/properties/add">
              Add Property
            </Link>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        <div className="property-controls">
          <input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            placeholder="Filter by category"
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
          />
          <input
            placeholder="Filter by department"
            value={filters.department}
            onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="DISPOSED">Disposed</option>
          </select>
          <button className="toggle-view-btn" type="button" onClick={() => setViewMode((prev) => (prev === "card" ? "table" : "card"))}>
            {viewMode === "card" ? "Table View" : "Card View"}
          </button>
        </div>
        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner" />
          </div>
        ) : visibleProperties.length === 0 ? (
          <div className="empty-state">No properties found for your account.</div>
        ) : viewMode === "card" ? (
          <div className="property-grid">
            {visibleProperties.map((property) => (
              <article key={property.id} className="property-item-card">
                <img
                  className="property-image"
                  src={absoluteUrl(property.image || property.photo || property.qr_code)}
                  alt={property.title || property.name || "Property"}
                />
                <div className="property-item-body">
                  <h3>{property.title || property.name || "Untitled Property"}</h3>
                  <p>{property.description || property.category || "No description"}</p>
                  <div className="property-meta-grid">
                    <div><span>Property ID</span><strong>{property.id || "N/A"}</strong></div>
                    <div><span>Property Code</span><strong>{property.property_code || "N/A"}</strong></div>
                    <div><span>Serial Number</span><strong>{property.serial_number || "N/A"}</strong></div>
                    <div><span>Category</span><strong>{property.category || "N/A"}</strong></div>
                    <div><span>Model</span><strong>{property.model || "N/A"}</strong></div>
                    <div><span>Department</span><strong>{property.department || "N/A"}</strong></div>
                    <div><span>Location</span><strong>{property.location || "N/A"}</strong></div>
                    <div><span>Status</span><strong>{property.status || "N/A"}</strong></div>
                    <div><span>Condition</span><strong>{property.condition || "N/A"}</strong></div>
                    <div><span>Approval</span><strong>{property.approval_status || "N/A"}</strong></div>
                    <div><span>Purchase Year</span><strong>{property.purchase_year || "N/A"}</strong></div>
                    <div><span>Monetary Value</span><strong>{formatCurrency(property.value ?? property.monetary_value)}</strong></div>
                    <div><span>Owner</span><strong>{property.owner_username || "N/A"}</strong></div>
                    <div><span>Current Assignee</span><strong>{property.assignee_username || "N/A"}</strong></div>
                    <div><span>Registered By</span><strong>{property.created_by_username || property.created_by_details?.username || "N/A"}</strong></div>
                    <div><span>Created At</span><strong>{formatDate(property.created_at)}</strong></div>
                    <div><span>Updated At</span><strong>{formatDate(property.updated_at)}</strong></div>
                  </div>
                </div>

                <div className="qr-wrap">
                  {property.qr_code ? (
                    <>
                      <img
                        className="qr-image"
                        src={absoluteUrl(property.qr_code)}
                        alt="Property QR Code"
                      />
                      <a
                        className="qr-download"
                        href={absoluteUrl(property.qr_code)}
                        download
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download QR
                      </a>
                    </>
                  ) : (
                    <span className="qr-empty">QR unavailable</span>
                  )}
                </div>

                {canManageAll && (
                  <div className="row-actions">
                    <button type="button" className="delete-btn" onClick={() => handleDelete(property.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
                ) : (
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Property ID</th>
                  <th>Name</th>
                  <th>Property Code</th>
                  <th>Serial Number</th>
                  <th>Category</th>
                  <th>Model</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Owner</th>
                  <th>Assigned To</th>
                  <th>Registered By</th>
                  <th>Purchase Year</th>
                  <th>Value</th>
                  <th>Approval</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th>QR</th>
                </tr>
              </thead>
              <tbody>
                {visibleProperties.map((property) => (
                  <tr key={property.id}>
                    <td>{property.id || "N/A"}</td>
                    <td>{property.title || property.name || "N/A"}</td>
                    <td className="property-code-cell">{property.property_code || "N/A"}</td>
                    <td>{property.serial_number || "N/A"}</td>
                    <td>{property.category || "N/A"}</td>
                    <td>{property.model || "N/A"}</td>
                    <td>{property.department || "N/A"}</td>
                    <td>{property.location || "N/A"}</td>
                    <td>{property.status || "N/A"}</td>
                    <td>{property.condition || "N/A"}</td>
                    <td>{property.owner_username || "N/A"}</td>
                    <td>{resolveResponsibleUser(property)}</td>
                    <td>{property.created_by_username || property.created_by_details?.username || "N/A"}</td>
                    <td>{property.purchase_year || "N/A"}</td>
                    <td>{formatCurrency(property.value ?? property.monetary_value)}</td>
                    <td>{property.approval_status || "N/A"}</td>
                    <td>{formatDate(property.created_at)}</td>
                    <td>{formatDate(property.updated_at)}</td>
                    <td>
                      {property.qr_code ? (
                        <a href={absoluteUrl(property.qr_code)} target="_blank" rel="noreferrer">View QR</a>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Properties;
