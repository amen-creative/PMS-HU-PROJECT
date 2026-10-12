import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import RobustQrScanner from "../utils/qrScanner";
import "./Enterprise.css";
import "./Verification.css";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseScannedValue(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        property_code: parsed.property_code || undefined,
        hash_value: parsed.hash_value || parsed.qr_hash || parsed.secure_hash || undefined,
        property_id: parsed.property_id || undefined,
        serial_number: parsed.serial_number || undefined
      };
    }
  } catch (error) {
    // Non-JSON values continue through URL and text parsing.
  }

  if (isUuid(raw)) {
    return { property_code: raw };
  }

  try {
    const url = new URL(raw);
    const propertyCode = url.searchParams.get("property_code") || "";
    const hash = url.searchParams.get("hash_value") || url.searchParams.get("hash") || "";
    const propertyId = url.searchParams.get("property_id") || "";
    const serialNumber = url.searchParams.get("serial_number") || "";

    if (propertyCode || hash || propertyId || serialNumber) {
      return {
        property_code: propertyCode || undefined,
        hash_value: hash || undefined,
        property_id: propertyId || undefined,
        serial_number: serialNumber || undefined
      };
    }

    const verifyMatch = url.pathname.match(
      /\/(?:api\/)?verify\/([0-9a-f-]{36})\/([^/?#]+)/i
    );
    if (verifyMatch) {
      return {
        property_code: verifyMatch[1],
        hash_value: decodeURIComponent(verifyMatch[2])
      };
    }

    const propertyMatch = url.pathname.match(/\/property(?:ies)?\/(\d+)/i);
    if (propertyMatch) {
      return { property_id: propertyMatch[1] };
    }
  } catch (error) {
    // Non-URL values fall through to serial/UUID parsing.
  }

  return { serial_number: raw };
}

function Verification() {
  const { accessToken } = useAuth();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const inFlightRef = useRef(false);
  const uploadInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const runVerification = async (rawValue, parsedPayload) => {
    const payload = parsedPayload || parseScannedValue(rawValue);
    if (
      !payload.property_code &&
      !payload.property_id &&
      !payload.serial_number
    ) {
      throw new Error("The scanned QR code does not contain a usable property reference.");
    }

    setLoading(true);
    setError("");
    setScanStatus(rawValue ? `Scanned: ${rawValue}` : "Verifying scanned asset...");
    try {
      const response = await fetch(apiUrl("/api/properties/verify/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.detail ||
          data.error ||
          data.status ||
          "Verification failed. Please try again.";
        throw new Error(message);
      }

      setResult(data);
      setScanStatus(rawValue ? `Verified from QR: ${rawValue}` : "Verification completed.");
      stopCamera();
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (!(await RobustQrScanner.hasCamera())) {
      setError("Camera API not supported in this browser. Please use Chrome, Edge, or Firefox.");
      return;
    }

    if (!RobustQrScanner.isSecureContext()) {
      setError("Camera access requires HTTPS. Please use a secure connection.");
      return;
    }

    setError("");
    setResult(null);
    setScanStatus("Checking camera permissions...");

    try {
      // Stop any existing scanner first
      stopCamera();

      const qrScanner = new RobustQrScanner(
        videoRef.current,
        async (result) => {
          if (!inFlightRef.current && result) {
            inFlightRef.current = true;
            try {
              console.log("Processing QR result:", result);
              if (result.startsWith("camera_error:")) {
                setError(result.replace("camera_error:", "").trim());
                return;
              }
              await runVerification(result);
            } catch (scanError) {
              console.error("Scan processing error:", scanError);
              setError(scanError.message || "Unable to read the QR code.");
            } finally {
              inFlightRef.current = false;
            }
          }
        }
      );

      qrScannerRef.current = qrScanner;
      setScanStatus("Starting camera...");

      console.log("Attempting to start camera...");
      const success = await qrScanner.start();

      if (success) {
        setCameraActive(true);
        setScanStatus("Camera is live. Point it at a property QR code.");
        console.log("Camera started successfully");
      } else {
        setScanStatus("Camera could not decode QR automatically. Use upload or manual verification below.");
        console.warn("Camera start returned false");
      }
    } catch (cameraError) {
      console.error("Camera start error:", cameraError);
      setError(`Camera error: ${cameraError.message}`);
      setScanStatus("");
      stopCamera();
    }
  };

  const handleUploadClick = () => {
    setError("");
    uploadInputRef.current?.click();
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setError("");
      setResult(null);
      setScanStatus(`Reading QR image: ${file.name}`);
      const decodedValue = await RobustQrScanner.scanImage(file);
      await runVerification(decodedValue);
    } catch (uploadError) {
      setError(uploadError.message || "Unable to read the uploaded QR image.");
    }
  };

  useEffect(() => stopCamera, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const propertyCode = params.get("property_code");
    const hash = params.get("hash") || params.get("hash_value");
    const propertyId = params.get("property_id");
    const serialNumber = params.get("serial_number");

    if (!propertyCode && !propertyId && !serialNumber) {
      return;
    }

    runVerification("", {
      property_code: propertyCode || undefined,
      hash_value: hash || undefined,
      property_id: propertyId || undefined,
      serial_number: serialNumber || undefined
    }).catch((requestError) => {
      setError(requestError.message || "Verification failed.");
    });
  }, [accessToken]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    try {
      await runVerification(manualValue);
      setManualValue("");
    } catch (submitError) {
      setError(submitError.message || "Verification failed.");
    }
  };

  const property = result?.property;
  const verification = result?.verification;
  const verificationStatus = result?.status;

  return (
    <div className="page-shell verification-shell">
      <div className="page-card verification-card">
        <div className="page-head verification-head">
          <div>
            <h2>Security Verification</h2>
            <p>
              Open the camera, scan the QR code on the asset, and confirm whether
              the property record is valid.
            </p>
          </div>
          <div className="verification-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={loading}
            >
              {cameraActive ? "Stop Camera" : "Scan With Camera"}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={handleUploadClick}
              disabled={loading}
            >
              Upload QR Image
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden-upload-input"
              onChange={handleUploadChange}
            />
          </div>
        </div>

        <div className="verification-layout">
          <section className="scanner-panel">
            <div className={`camera-frame ${cameraActive ? "camera-live" : ""}`}>
              <video ref={videoRef} playsInline muted className="camera-view" />
              {!cameraActive && (
                <div className="camera-placeholder">
                  <strong>Camera ready</strong>
                  <span>Tap "Scan With Camera" to open the scanner.</span>
                </div>
              )}
              {cameraActive && <div className="camera-overlay" aria-hidden="true" />}
            </div>

            <div className="verification-note">
              <strong>Scanner status</strong>
              <p>{scanStatus || "Waiting to start camera."}</p>
              {!cameraActive && (
                <p className="camera-info">
                  Upload a QR screenshot, or use the camera on Chrome or Edge for live scanning.
                </p>
              )}
            </div>

            <form className="input-grid verification-form" onSubmit={handleManualSubmit}>
              <label htmlFor="manual-qr">Manual fallback</label>
              <input
                id="manual-qr"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Paste QR link, property code, property ID, or serial number"
              />
              <button className="btn-primary" type="submit" disabled={loading || !manualValue.trim()}>
                {loading ? "Verifying..." : "Verify Value"}
              </button>
            </form>

            <p className="verification-helper">
              Start the camera, upload a QR image, or paste the scanned value manually.
            </p>
          </section>

          <section className="result-panel">
            {error && <p className="verification-error">{error}</p>}

            {result ? (
              <div className={`result-card status-${String(result.alert_type?.toLowerCase() || verificationStatus || "").toLowerCase()}`}>
                <span className={`result-badge alert-${(result.alert_type || "").toLowerCase()}`}>
                  {result.alert_type || verificationStatus || "UNKNOWN"}
                </span>
                <h3>{property?.title || property?.name || "Verified Property"}</h3>
                <p className="verification-message">{result.message || property?.description || "No description available."}</p>

                {(property?.image || property?.photo) && (
                  <div className="verification-image-wrap">
                    <img
                      className="verification-property-image"
                      src={property.image || property.photo}
                      alt={property?.title || property?.name || "Verified property"}
                    />
                  </div>
                )}

                <div className="result-grid">
                  <div>
                    <span>Category</span>
                    <strong>{property?.category || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Serial Number</span>
                    <strong>{property?.serial_number || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Department</span>
                    <strong>{property?.department || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Assigned To</span>
                    <strong>{property?.assigned_to || property?.owner_name || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Approval Status</span>
                    <strong>{property?.approval_status || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Verified By</span>
                    <strong>{verification?.verified_by || "N/A"}</strong>
                  </div>
                </div>

                {result.security_info && (
                  <div className="security-info-section">
                    <strong>Security Information</strong>
                    <div className="security-grid">
                      <div>
                        <span>Hash Matched</span>
                        <strong>{result.security_info.hash_matched ? "Yes" : "No"}</strong>
                      </div>
                      <div>
                        <span>Property Code</span>
                        <strong>{result.security_info.property_code || "N/A"}</strong>
                      </div>
                      <div>
                        <span>IP Address</span>
                        <strong>{verification?.ip_address || "N/A"}</strong>
                      </div>
                      <div>
                        <span>Verified At</span>
                        <strong>{verification?.verified_at ? new Date(verification.verified_at).toLocaleString() : "N/A"}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {result.transfer_records && result.transfer_records.length > 0 && (
                  <div className="transfer-history-section">
                    <strong>Recent Transfer History</strong>
                    <div className="transfer-list">
                      {result.transfer_records.slice(0, 3).map((transfer, index) => (
                        <div key={index} className="transfer-item">
                          <span>{transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : "N/A"}</span>
                          <strong>{transfer.from_user} -> {transfer.to_user}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="verification-note">
                  <strong>Verification note</strong>
                  <p>{verification?.notes || "Property verified successfully."}</p>
                </div>
              </div>
            ) : (
              <div className="result-empty">
                <h3>No verification result yet</h3>
                <p>
                  Start the camera, upload a QR image, or paste a scanned value
                  into the manual field to verify the asset.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Verification;
