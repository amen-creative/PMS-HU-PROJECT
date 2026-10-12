import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import AppIcon from "./AppIcon";
import BrandLogo from "./BrandLogo";
import "./Navbar.css";

function Navbar({ onToggleSidebar, onToggleSidebarCollapse, isSidebarCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchTerm, setSearchTerm] = useState("");
  const initials = (user?.username || "HU").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      navigate("/properties/search");
      return;
    }
    navigate(`/properties/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="top-navbar">
      <div className="navbar-leading">
        <button
          type="button"
          className="icon-button mobile-only"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
        >
          <AppIcon name="menu" size={18} />
        </button>
        <button
          type="button"
          className="icon-button desktop-only"
          onClick={onToggleSidebarCollapse}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <AppIcon name={isSidebarCollapsed ? "chevronRight" : "chevronLeft"} size={18} />
        </button>
        <div className="navbar-title">
          <span className="navbar-kicker">HARAMAYA UNIVERSITY</span>
          <div className="navbar-brandline">
            <BrandLogo compact className="navbar-brand-mark" />
            <h3>Property Management System</h3>
          </div>
        </div>
      </div>

      <form className="navbar-search" aria-label="Search assets" onSubmit={handleSearchSubmit}>
        <AppIcon name="search" size={16} />
        <input
          type="search"
          placeholder="Search assets, tags, locations..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="submit" className="navbar-search-submit" aria-label="Search">
          <AppIcon name="search" size={16} />
        </button>
      </form>

      <div className="navbar-actions">
        <details className="notification-dropdown">
          <summary className="icon-button notification-button">
            <AppIcon name="notifications" size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </summary>
          <div className="notification-menu">
            {notifications.length > 0 ? (
              <>
                {notifications.slice(0, 5).map((item) => (
                  <div 
                    key={item.notification_id} 
                    className={`notification-item ${!item.is_read ? 'unread' : ''}`}
                    onClick={() => !item.is_read && markAsRead(item.notification_id)}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{new Date(item.created_at).toLocaleDateString()}</small>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="notification-footer">
                    <button 
                      className="btn-link" 
                      onClick={() => navigate('/notifications')}
                    >
                      View all notifications
                    </button>
                  </div>
                )}
                {unreadCount > 0 && (
                  <div className="notification-footer">
                    <button 
                      className="btn-link" 
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="notification-item">
                <p>No notifications</p>
              </div>
            )}
          </div>
        </details>

        <button
          type="button"
          className="user-summary"
          onClick={() => navigate(location.pathname === "/profile" ? "/" : "/profile")}
        >
          <div className="user-avatar">{initials}</div>
          <div className="user-meta">
            <strong>{user?.username || "Authenticated User"}</strong>
            <span>{role ? role.replace("_", " ") : "Loading..."}</span>
          </div>
        </button>

        <button type="button" className="logout-top-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
