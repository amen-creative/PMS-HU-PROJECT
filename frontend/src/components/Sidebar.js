import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";
import BrandLogo from "./BrandLogo";
import "./Sidebar.css";

function Sidebar({ isOpen, isCollapsed, onNavigate }) {
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  const canAddProperty = ["ADMIN", "PROPERTY_OFFICER", "STAFF", "STUDENT"].includes(role);
  const canManageUsers = ["ADMIN", "PROPERTY_OFFICER"].includes(role);

  // Role-specific navigation items
  const getNavItems = () => {
    if (role === "STUDENT") {
      return [
        { to: "/student-dashboard", label: "My Dashboard", icon: "dashboard" },
        { to: "/properties", label: "My Devices", icon: "assets" },
        { to: "/verification", label: "Gate Verification", icon: "qr" },
        { to: "/incidents", label: "Report Issue", icon: "incidents" },
        { to: "/settings", label: "Profile Settings", icon: "settings" }
      ];
    }

    const baseItems = [
      { to: "/", label: "Dashboard", icon: "dashboard" },
      { to: "/properties", label: "Properties", icon: "assets" },
      ...(canAddProperty ? [{ to: "/properties/add", label: "Add Property", icon: "plus" }] : []),
      { to: "/assignments", label: "Assignments", icon: "assignments" },
      { to: "/transfers", label: "Transfers", icon: "transfers" },
      { to: "/incidents", label: "Incidents", icon: "incidents" },
      ...(canManageUsers ? [{ to: "/user-management", label: "User Management", icon: "users" }] : []),
      { to: "/reports", label: "Reports", icon: "reports" },
      { to: "/notifications", label: "Notifications", icon: "notifications" },
      { to: "/settings", label: "Settings", icon: "settings" }
    ];

    // Add guest management for security staff
    if (["ADMIN", "SECURITY", "PROPERTY_OFFICER"].includes(role)) {
      baseItems.splice(4, 0, { to: "/guest-management", label: "Guest Access", icon: "users" });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    onNavigate();
    navigate("/login");
  };

  return (
    <>
      {isOpen && <button className="sidebar-backdrop" onClick={onNavigate} aria-label="Close menu" />}
      <aside className={`sidebar ${isOpen ? "is-open" : ""} ${isCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <BrandLogo compact={isCollapsed} />
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <AppIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-section-label">System</div>
          <button
            type="button"
            className="sidebar-link logout-link"
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
          >
            <AppIcon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
