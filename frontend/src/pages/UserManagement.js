import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./UserManagement.css";

function UserManagement() {
  const { accessToken, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "STAFF",
    department: "",
    position: "",
    phone_number: "",
    university_id: "",
    is_staff: false,
    is_superuser: false
  });

  const canManageUsers = role === "ADMIN" || role === "PROPERTY_OFFICER";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/users/"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to load users.");
      }

      const data = await response.json();
      setUsers(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [accessToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      role: "STAFF",
      department: "",
      position: "",
      phone_number: "",
      university_id: "",
      is_staff: false,
      is_superuser: false
    });
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageUsers) return;

    try {
      setError("");
      setSuccess("");

      const url = editingUser 
        ? apiUrl(`/api/users/${editingUser.id}/`)
        : apiUrl("/api/users/");
      
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || body?.username?.[0] || "Failed to save user.");
      }

      setSuccess(editingUser ? "User updated successfully." : "User created successfully.");
      resetForm();
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to save user.");
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role,
      department: user.department || "",
      position: user.position || "",
      phone_number: user.phone_number || "",
      university_id: user.university_id || "",
      is_staff: user.is_staff,
      is_superuser: user.is_superuser
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId) => {
    if (!canManageUsers) return;
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      setError("");
      const response = await fetch(apiUrl(`/api/users/${userId}/`), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete user.");
      }

      setSuccess("User deleted successfully.");
      fetchUsers();
    } catch (err) {
      setError(err.message || "Failed to delete user.");
    }
  };

  if (!canManageUsers) {
    return (
      <div className="user-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="user-management-card">
        <div className="user-management-header">
          <div>
            <h2>User Management</h2>
            <p>Create, edit, and manage system users.</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => {
              resetForm();
              setShowCreateForm(!showCreateForm);
            }}
          >
            {showCreateForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {showCreateForm && (
          <div className="user-form-overlay">
            <div className="user-form-card">
              <h3>{editingUser ? "Edit User" : "Create User"}</h3>
              <form className="user-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="PROPERTY_OFFICER">Property Officer</option>
                      <option value="DEPT_HEAD">Department Head</option>
                      <option value="STAFF">Staff</option>
                      <option value="STUDENT">Student</option>
                      <option value="SECURITY">Security</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>University ID</label>
                  <input
                    type="text"
                    name="university_id"
                    value={formData.university_id}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <label>
                    <input
                      type="checkbox"
                      name="is_staff"
                      checked={formData.is_staff}
                      onChange={handleChange}
                    />
                    Staff Access
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="is_superuser"
                      checked={formData.is_superuser}
                      onChange={handleChange}
                    />
                    Superuser
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingUser ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner" />
          </div>
        ) : (
          <div className="users-table">
            <table className="list-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>University ID</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email || "N/A"}</td>
                    <td>{user.role}</td>
                    <td>{user.department || "N/A"}</td>
                    <td>{user.position || "N/A"}</td>
                    <td>{user.university_id || "N/A"}</td>
                    <td>{user.is_active ? "Yes" : "No"}</td>
                    <td>
                      <button
                        className="btn-small btn-primary"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(user.id)}
                      >
                        Delete
                      </button>
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

export default UserManagement;
