import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/AppIcon";
import { apiUrl } from "../config/api";
import "./Properties.css";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "LOST", label: "Lost" }
];

const conditionOptions = [
  { value: "", label: "All Conditions" },
  { value: "NEW", label: "New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" }
];

function PropertySearch() {
  const { accessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchData, setSearchData] = useState({
    results: [],
    count: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
    filters_applied: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Search form state
  const [searchForm, setSearchForm] = useState({
    q: searchParams.get("q") || "",
    qr_code: "",
    serial_number: "",
    model: "",
    department: "",
    assigned_user: "",
    status: "",
    condition: "",
    category: "",
    page: 1,
    page_size: 20
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
  }, [accessToken]);

  useEffect(() => {
    const incomingQuery = searchParams.get("q") || "";
    setSearchForm((prev) => {
      if (prev.q === incomingQuery) {
        return prev;
      }
      return { ...prev, q: incomingQuery, page: 1 };
    });
  }, [searchParams]);

  useEffect(() => {
    performSearch(1, searchParams.get("q") || searchForm.q);
  }, [accessToken, searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/categories/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(apiUrl("/api/properties/departments/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const performSearch = async (page = 1, queryOverride) => {
    setLoading(true);
    setError("");
    
    const effectiveForm = {
      ...searchForm,
      q: queryOverride !== undefined ? queryOverride : searchForm.q
    };
    const params = new URLSearchParams();
    
    // Add all non-empty search parameters
    Object.keys(effectiveForm).forEach(key => {
      const value = effectiveForm[key];
      if (value && key !== "page") {
        params.append(key, value);
      }
    });
    
    params.append("page", page);
    params.append("page_size", effectiveForm.page_size);

    try {
      const response = await fetch(apiUrl(`/api/properties/search/?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchData(data);
      setSearchForm((prev) => ({ ...prev, ...effectiveForm, page: data.page }));
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchForm.q.trim()) {
      params.set("q", searchForm.q.trim());
    } else {
      params.delete("q");
    }
    setSearchParams(params);
    performSearch(1, searchForm.q.trim());
  };

  const handleClear = () => {
    const clearedForm = {
      q: "",
      qr_code: "",
      serial_number: "",
      model: "",
      department: "",
      assigned_user: "",
      status: "",
      condition: "",
      category: "",
      page: 1,
      page_size: 20
    };
    setSearchForm(clearedForm);
    setSearchParams({});
    performSearch(1, "");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= searchData.total_pages) {
      performSearch(newPage);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'status-success';
      case 'assigned': return 'status-primary';
      case 'damaged': return 'status-danger';
      case 'lost': return 'status-warning';
      default: return 'status-neutral';
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Advanced Property Search</h2>
            <p>Search and filter properties using multiple criteria</p>
          </div>
        </div>

        {/* Search Form */}
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-grid">
            {/* General Search */}
            <div className="search-field">
              <label htmlFor="q">General Search</label>
              <input
                id="q"
                name="q"
                type="text"
                value={searchForm.q}
                onChange={handleInputChange}
                placeholder="Search in title, name, description, serial..."
              />
            </div>

            {/* QR Code */}
            <div className="search-field">
              <label htmlFor="qr_code">QR Code / Property Code</label>
              <input
                id="qr_code"
                name="qr_code"
                type="text"
                value={searchForm.qr_code}
                onChange={handleInputChange}
                placeholder="Enter QR code or UUID"
              />
            </div>

            {/* Serial Number */}
            <div className="search-field">
              <label htmlFor="serial_number">Serial Number</label>
              <input
                id="serial_number"
                name="serial_number"
                type="text"
                value={searchForm.serial_number}
                onChange={handleInputChange}
                placeholder="Enter serial number"
              />
            </div>

            {/* Model */}
            <div className="search-field">
              <label htmlFor="model">Model</label>
              <input
                id="model"
                name="model"
                type="text"
                value={searchForm.model}
                onChange={handleInputChange}
                placeholder="Enter model name"
              />
            </div>

            {/* Department */}
            <div className="search-field">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                name="department"
                value={searchForm.department}
                onChange={handleInputChange}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Assigned User */}
            <div className="search-field">
              <label htmlFor="assigned_user">Assigned User</label>
              <input
                id="assigned_user"
                name="assigned_user"
                type="text"
                value={searchForm.assigned_user}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </div>

            {/* Status */}
            <div className="search-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={searchForm.status}
                onChange={handleInputChange}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div className="search-field">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                name="condition"
                value={searchForm.condition}
                onChange={handleInputChange}
              >
                {conditionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="search-field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={searchForm.category}
                onChange={handleInputChange}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Page Size */}
            <div className="search-field">
              <label htmlFor="page_size">Results per page</label>
              <select
                id="page_size"
                name="page_size"
                value={searchForm.page_size}
                onChange={handleInputChange}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="search-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
            <button type="button" className="btn-secondary" onClick={handleClear}>
              Clear Filters
            </button>
          </div>
        </form>

        {/* Search Results */}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <div className="search-results">
            <div className="results-header">
              <h3>Search Results</h3>
              <p>
                Found {searchData.count} properties 
                {searchData.filters_applied && Object.keys(searchData.filters_applied).length > 0 && (
                  <span> with filters applied</span>
                )}
              </p>
            </div>

            {searchData.results.length > 0 ? (
              <>
                <div className="properties-table">
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Title/Name</th>
                        <th>Serial Number</th>
                        <th>Category</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Condition</th>
                        <th>Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchData.results.map(property => (
                        <tr key={property.id}>
                          <td>
                            <div className="property-title">
                              <strong>{property.title || property.name || "N/A"}</strong>
                              {property.description && (
                                <span className="property-description">
                                  {property.description.substring(0, 50)}...
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{property.serial_number || "N/A"}</td>
                          <td>{property.category || "N/A"}</td>
                          <td>{property.department || "N/A"}</td>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(property.status)}`}>
                              {property.status || "N/A"}
                            </span>
                          </td>
                          <td>{property.condition || "N/A"}</td>
                          <td>{property.assigned_to || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {searchData.total_pages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn-secondary"
                      onClick={() => handlePageChange(searchData.page - 1)}
                      disabled={searchData.page <= 1}
                    >
                      Previous
                    </button>
                    <span className="page-info">
                      Page {searchData.page} of {searchData.total_pages}
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => handlePageChange(searchData.page + 1)}
                      disabled={searchData.page >= searchData.total_pages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-results">
                <AppIcon name="search" size={48} />
                <h3>No properties found</h3>
                <p>Try adjusting your search criteria or filters</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Searching properties...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertySearch;
