import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "../utils/toast";
import "../pages/Enterprise.css";

const API_BASE = "http://127.0.0.1:8000";
const apiUrl = (path) => `${API_BASE}${path}`;

function UserSettings() {
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    department: "",
    phone: "",
    position: "",
    university_id: "",
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  // UC-11: System Settings state (ADMIN only)
  const isAdmin = user?.role === "ADMIN";
  const [systemSettings, setSystemSettings] = useState({
    first_escalation_hours: 48,
    admin_escalation_hours: 96,
    email_templates: {},
  });
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);

  const fetchSystemSettings = async () => {
    try {
      setSystemLoading(true);
      const res = await fetch(apiUrl("/api/settings/"), {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setSystemSettings({
          first_escalation_hours: data.first_escalation_hours ?? 48,
          admin_escalation_hours: data.admin_escalation_hours ?? 96,
          email_templates: data.email_templates ?? {},
          settings_id: data.settings_id,
        });
      }
    } catch {
      toast.error("Failed to load system settings", { position: "top-right", autoClose: 3000 });
    } finally {
      setSystemLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchSystemSettings();
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        department: user.department || "",
        phone: user.phone_number || "",
        position: user.position || "",
        university_id: user.university_id || ""
      }));
      setProfilePreview(user.profile_picture_url || "");
    }
  }, [user]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('phone_number', formData.phone);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('university_id', formData.university_id);
      
      if (profilePicture) {
        formDataToSend.append('profile_picture', profilePicture);
      }

      const response = await fetch(`${API_BASE}/api/users/profile/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Profile updated successfully", {
          position: "top-right",
          autoClose: 3000,
        });
        
        // Update user context with new data
        if (data.user) {
          // This would need to be implemented in AuthContext
          // updateUser(data.user);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update profile", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Profile picture must be less than 5MB", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }
      
      setProfilePicture(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const removeProfilePicture = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users/profile/remove-picture/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        setProfilePicture(null);
        setProfilePreview("");
        toast.success("Profile picture removed successfully", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        throw new Error("Failed to remove profile picture");
      }
    } catch (error) {
      toast.error("Failed to remove profile picture", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error("New passwords do not match", { position: "top-right", autoClose: 3000 });
      return;
    }

    if (formData.new_password.length < 8) {
      toast.error("Password must be at least 8 characters long", { position: "top-right", autoClose: 3000 });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl("/api/users/change-password/"), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          current_password: formData.current_password,
          new_password: formData.new_password
        })
      });

      if (response.ok) {
        toast.success("Password changed successfully", { position: "top-right", autoClose: 3000 });
        setFormData(prev => ({
          ...prev,
          current_password: "",
          new_password: "",
          confirm_password: ""
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }
    } catch (error) {
      toast.error(error.message || "Failed to change password", { position: "top-right", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };


  const exportUserData = async () => {
    try {
      const response = await fetch(apiUrl("/api/users/export-data/"), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_data_${user.username}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("User data exported successfully", { position: "top-right", autoClose: 3000 });
      } else {
        throw new Error("Failed to export data");
      }
    } catch (error) {
      toast.error("Failed to export user data", { position: "top-right", autoClose: 3000 });
    }
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <form onSubmit={updateProfile} className="settings-form">
            <div className="form-group">
              <label>Profile Picture</label>
              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="profile-preview-img" />
                  ) : (
                    <div className="profile-placeholder">
                      <span>No profile picture</span>
                    </div>
                  )}
                </div>
                <div className="profile-picture-controls">
                  <input
                    type="file"
                    id="profile_picture"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="profile_picture" className="btn-secondary">
                    Choose Picture
                  </label>
                  {profilePreview && (
                    <button type="button" onClick={removeProfilePicture} className="btn-danger">
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="disabled-input"
              />
              <small>Email cannot be changed</small>
            </div>
            
            <div className="form-group">
              <label>University ID</label>
              <input
                type="text"
                name="university_id"
                value={formData.university_id}
                onChange={handleInputChange}
                placeholder="Enter your university ID"
                required
              />
              <small>Required for students and staff</small>
            </div>
            
            <div className="form-group">
              <label>Position</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="Your position or role"
              />
            </div>
            
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Your department"
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Your phone number"
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </form>
        );

      case "security":
        return (
          <div className="security-section">
            <form onSubmit={changePassword} className="settings-form">
              <h3>Change Password</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                />
                <small>Password must be at least 8 characters long</small>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  required
                  minLength="8"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </button>
            </form>

            <div className="data-management">
              <h3>Data Management</h3>
              <div className="data-actions">
                <button onClick={exportUserData} className="btn-secondary">
                  Export My Data
                </button>
              </div>
            </div>
          </div>
        );

      // UC-11: System Settings tab (ADMIN only)
      case "system":
        if (!isAdmin) return null;
        return (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSystemSaving(true);
              try {
                const payload = {
                  first_escalation_hours: systemSettings.first_escalation_hours,
                  admin_escalation_hours: systemSettings.admin_escalation_hours,
                  email_templates: systemSettings.email_templates,
                };
                const res = await fetch(
                  apiUrl(`/api/settings/${systemSettings.settings_id}/`),
                  {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  }
                );
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.admin_escalation_hours?.join(" ") || err.first_escalation_hours?.join(" ") || err.error || "Failed");
                }
                toast.success("System settings saved. Changes apply immediately to all future escalations and notifications.", { position: "top-right", autoClose: 4000 });
                fetchSystemSettings();
              } catch (error) {
                toast.error(error.message, { position: "top-right", autoClose: 4000 });
              } finally {
                setSystemSaving(false);
              }
            }}
            className="settings-form"
          >
            <h3>Escalation Time Thresholds</h3>
            <p style={{ color: "#64748b", marginBottom: 16, fontSize: 14 }}>
              Configure when escalation notifications and emails are sent for pending assignments, transfers, and incidents.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>First Escalation (hours) *</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={systemSettings.first_escalation_hours}
                  onChange={(e) =>
                    setSystemSettings((p) => ({
                      ...p,
                      first_escalation_hours: parseInt(e.target.value) || 48,
                    }))
                  }
                  required
                />
                <small>Default: 48 hours. Notifies Department Head / IT Officer.</small>
              </div>
              <div className="form-group">
                <label>Admin Escalation (hours) *</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={systemSettings.admin_escalation_hours}
                  onChange={(e) =>
                    setSystemSettings((p) => ({
                      ...p,
                      admin_escalation_hours: parseInt(e.target.value) || 96,
                    }))
                  }
                  required
                />
                <small>Default: 96 hours. Escalates to Admin. Must be ≥ First Escalation.</small>
              </div>
            </div>

            <h3 style={{ marginTop: 24 }}>Email Notification Templates</h3>
            <p style={{ color: "#64748b", marginBottom: 16, fontSize: 14 }}>
              Customize email subject and body templates for system notifications.
            </p>
            <div className="form-group">
              <label>Assignment Escalation Subject</label>
              <input
                type="text"
                value={systemSettings.email_templates?.assignment_escalation_subject || ""}
                onChange={(e) =>
                  setSystemSettings((p) => ({
                    ...p,
                    email_templates: {
                      ...p.email_templates,
                      assignment_escalation_subject: e.target.value,
                    },
                  }))
                }
                placeholder="Assignment Pending Escalation"
              />
            </div>
            <div className="form-group">
              <label>Transfer Notification Subject</label>
              <input
                type="text"
                value={systemSettings.email_templates?.transfer_notification_subject || ""}
                onChange={(e) =>
                  setSystemSettings((p) => ({
                    ...p,
                    email_templates: {
                      ...p.email_templates,
                      transfer_notification_subject: e.target.value,
                    },
                  }))
                }
                placeholder="Property Transfer Request"
              />
            </div>
            <div className="form-group">
              <label>Incident Notification Subject</label>
              <input
                type="text"
                value={systemSettings.email_templates?.incident_notification_subject || ""}
                onChange={(e) =>
                  setSystemSettings((p) => ({
                    ...p,
                    email_templates: {
                      ...p.email_templates,
                      incident_notification_subject: e.target.value,
                    },
                  }))
                }
                placeholder="Incident Reported"
              />
            </div>

            <div style={{ marginTop: 16, padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <small style={{ color: "#166534" }}>
                <strong>Note:</strong> Changes are applied immediately to all future notifications and escalations. Configuration changes are logged in the Audit Log.
              </small>
            </div>

            <button type="submit" className="btn-primary" disabled={systemSaving} style={{ marginTop: 16 }}>
              {systemSaving ? "Saving..." : "Save System Settings"}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <h2>Settings</h2>
          <p>Manage your account settings and preferences</p>
        </div>

        <div className="settings-container">
          <div className="settings-tabs">
            <button
              className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`tab-button ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              Security
            </button>
            {isAdmin && (
              <button
                className={`tab-button ${activeTab === "system" ? "active" : ""}`}
                onClick={() => setActiveTab("system")}
              >
                System Settings
              </button>
            )}
          </div>

          <div className="settings-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
