import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/AppIcon";
import { apiUrl } from "../config/api";
import "./Properties.css";

const reportTypes = [
  { value: "inventory", label: "Inventory Report", description: "Complete inventory overview with status breakdowns" },
  { value: "missing_damaged", label: "Missing & Damaged Items", description: "Items that are lost or need repair" },
  { value: "ownership", label: "Ownership Logs", description: "Current assignments and ownership history" },
  { value: "transfers", label: "Transfer History", description: "All transfer requests and their status" }
];

function Reports() {
  const { accessToken } = useAuth();
  const [selectedReport, setSelectedReport] = useState("inventory");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportData(selectedReport);
  }, [selectedReport]);

  const fetchReportData = async (reportType) => {
    setLoading(true);
    setError("");
    setReportData(null);

    try {
      const response = await fetch(apiUrl(`/api/properties/reports/?type=${reportType}`), {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (e) => {
    setSelectedReport(e.target.value);
  };

  const reportTypeToExportType = {
    inventory: "inventory",
    transfers: "transfers",
    missing_damaged: "incidents",
    ownership: "department_summary"
  };

  const handleExport = async (format) => {
    try {
      const exportType = reportTypeToExportType[selectedReport] || "inventory";
      const response = await fetch(apiUrl("/api/reports/export/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          report_type: exportType,
          format
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Export failed");
      }

      const blob = await response.blob();
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${exportType}_report.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError.message || "Export failed.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const renderInventoryReport = () => {
    if (!reportData?.data) return null;

    const { total_properties, by_status, by_condition, by_category, by_department, properties } = reportData.data;

    return (
      <div className="report-content">
        <div className="report-summary">
          <h3>Inventory Summary</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{total_properties || 0}</strong>
              <span>Total Properties</span>
            </div>
            <div className="summary-card">
              <strong>{by_status?.find(s => s.status === 'ASSIGNED')?.count || 0}</strong>
              <span>Assigned Items</span>
            </div>
            <div className="summary-card">
              <strong>{by_status?.find(s => s.status === 'AVAILABLE')?.count || 0}</strong>
              <span>Available Items</span>
            </div>
            <div className="summary-card">
              <strong>{by_status?.find(s => s.status === 'DAMAGED')?.count || 0}</strong>
              <span>Damaged Items</span>
            </div>
          </div>
        </div>

        {by_status && (
          <div className="report-section">
            <h4>By Status</h4>
            <div className="status-breakdown">
              {by_status.map(item => (
                <div key={item.status} className="status-item">
                  <span className="status-label">{item.status}</span>
                  <span className="status-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {by_category && (
          <div className="report-section">
            <h4>By Category</h4>
            <div className="category-breakdown">
              {by_category.map(item => (
                <div key={item.category} className="category-item">
                  <span className="category-label">{item.category}</span>
                  <span className="category-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {properties && properties.length > 0 && (
          <div className="report-section">
            <h4>Recent Properties (First 100)</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Serial Number</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.slice(0, 50).map(property => (
                    <tr key={property.id}>
                      <td>{property.title || property.name || "N/A"}</td>
                      <td>{property.serial_number || "N/A"}</td>
                      <td>{property.category || "N/A"}</td>
                      <td>{property.department || "N/A"}</td>
                      <td>{property.status || "N/A"}</td>
                      <td>{property.condition || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMissingDamagedReport = () => {
    if (!reportData?.data) return null;

    const { missing_items, damaged_items, incidents } = reportData.data;

    return (
      <div className="report-content">
        <div className="report-summary">
          <h3>Missing & Damaged Items Summary</h3>
          <div className="summary-grid">
            <div className="summary-card danger">
              <strong>{missing_items?.length || 0}</strong>
              <span>Missing Items</span>
            </div>
            <div className="summary-card warning">
              <strong>{damaged_items?.length || 0}</strong>
              <span>Damaged Items</span>
            </div>
            <div className="summary-card">
              <strong>{incidents?.length || 0}</strong>
              <span>Related Incidents</span>
            </div>
          </div>
        </div>

        {missing_items && missing_items.length > 0 && (
          <div className="report-section">
            <h4>Missing Items</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Serial Number</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Last Assigned To</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {missing_items.map(property => (
                    <tr key={property.id}>
                      <td>{property.title || property.name || "N/A"}</td>
                      <td>{property.serial_number || "N/A"}</td>
                      <td>{property.category || "N/A"}</td>
                      <td>{property.department || "N/A"}</td>
                      <td>{property.assigned_to || "N/A"}</td>
                      <td>{formatDate(property.last_seen_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {damaged_items && damaged_items.length > 0 && (
          <div className="report-section">
            <h4>Damaged Items</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Serial Number</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Assigned To</th>
                    <th>Damage Type</th>
                  </tr>
                </thead>
                <tbody>
                  {damaged_items.map(property => (
                    <tr key={property.id}>
                      <td>{property.title || property.name || "N/A"}</td>
                      <td>{property.serial_number || "N/A"}</td>
                      <td>{property.category || "N/A"}</td>
                      <td>{property.department || "N/A"}</td>
                      <td>{property.assigned_to || "N/A"}</td>
                      <td>{property.damage_type || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOwnershipReport = () => {
    if (!reportData?.data) return null;

    const { current_assignments, transfer_history, ownership_changes } = reportData.data;

    return (
      <div className="report-content">
        <div className="report-summary">
          <h3>Ownership & Assignment Report</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{current_assignments?.length || 0}</strong>
              <span>Current Assignments</span>
            </div>
            <div className="summary-card">
              <strong>{transfer_history?.length || 0}</strong>
              <span>Transfer Records</span>
            </div>
            <div className="summary-card">
              <strong>{ownership_changes?.length || 0}</strong>
              <span>Ownership Changes</span>
            </div>
          </div>
        </div>

        {current_assignments && current_assignments.length > 0 && (
          <div className="report-section">
            <h4>Current Assignments</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Assigned To</th>
                    <th>Department</th>
                    <th>Assigned Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {current_assignments.slice(0, 50).map(assignment => (
                    <tr key={assignment.id}>
                      <td>{assignment.property_title || "N/A"}</td>
                      <td>{assignment.assigned_to || "N/A"}</td>
                      <td>{assignment.department || "N/A"}</td>
                      <td>{formatDate(assignment.assigned_date)}</td>
                      <td>{assignment.status || "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {transfer_history && transfer_history.length > 0 && (
          <div className="report-section">
            <h4>Recent Transfer History</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Transfer Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer_history.slice(0, 50).map(transfer => (
                    <tr key={transfer.id}>
                      <td>{transfer.property_title || "N/A"}</td>
                      <td>{transfer.from_user || "N/A"}</td>
                      <td>{transfer.to_user || "N/A"}</td>
                      <td>{formatDate(transfer.transfer_date)}</td>
                      <td>{transfer.status || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransfersReport = () => {
    if (!reportData?.data) return null;

    const { all_transfers, pending_transfers, completed_transfers } = reportData.data;

    return (
      <div className="report-content">
        <div className="report-summary">
          <h3>Transfer Activity Report</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <strong>{all_transfers?.length || 0}</strong>
              <span>Total Transfers</span>
            </div>
            <div className="summary-card warning">
              <strong>{pending_transfers?.length || 0}</strong>
              <span>Pending Transfers</span>
            </div>
            <div className="summary-card success">
              <strong>{completed_transfers?.length || 0}</strong>
              <span>Completed Transfers</span>
            </div>
          </div>
        </div>

        {pending_transfers && pending_transfers.length > 0 && (
          <div className="report-section">
            <h4>Pending Transfers</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Requester</th>
                    <th>From Department</th>
                    <th>To Department</th>
                    <th>Request Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pending_transfers.map(transfer => (
                    <tr key={transfer.id}>
                      <td>{transfer.property_title || "N/A"}</td>
                      <td>{transfer.requester || "N/A"}</td>
                      <td>{transfer.from_department || "N/A"}</td>
                      <td>{transfer.to_department || "N/A"}</td>
                      <td>{formatDate(transfer.request_date)}</td>
                      <td>{transfer.status || "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {completed_transfers && completed_transfers.length > 0 && (
          <div className="report-section">
            <h4>Completed Transfers</h4>
            <div className="properties-table">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Completed Date</th>
                    <th>Processed By</th>
                  </tr>
                </thead>
                <tbody>
                  {completed_transfers.slice(0, 50).map(transfer => (
                    <tr key={transfer.id}>
                      <td>{transfer.property_title || "N/A"}</td>
                      <td>{transfer.from_user || "N/A"}</td>
                      <td>{transfer.to_user || "N/A"}</td>
                      <td>{formatDate(transfer.completed_date)}</td>
                      <td>{transfer.processed_by || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case "inventory":
        return renderInventoryReport();
      case "missing_damaged":
        return renderMissingDamagedReport();
      case "ownership":
        return renderOwnershipReport();
      case "transfers":
        return renderTransfersReport();
      default:
        return <div>Select a report type to view</div>;
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Comprehensive Reports</h2>
            <p>Detailed analytics and reports for property management</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-secondary" type="button" onClick={() => handleExport("excel")}>
              Export Excel
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleExport("pdf")}>
              Export PDF
            </button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="report-selector">
          <label htmlFor="report-type">Select Report Type</label>
          <select
            id="report-type"
            value={selectedReport}
            onChange={handleReportTypeChange}
            className="report-select"
          >
            {reportTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="report-description">
            {reportTypes.find(t => t.value === selectedReport)?.description}
          </p>
        </div>

        {/* Report Content */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Generating report...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!loading && !error && reportData && (
          <div className="report-container">
            <div className="report-header">
              <h3>{reportTypes.find(t => t.value === selectedReport)?.label}</h3>
              <p className="report-meta">
                Generated on {formatDate(reportData.generated_at)}
              </p>
            </div>
            {renderReportContent()}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
