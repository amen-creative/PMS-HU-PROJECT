import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "../utils/toast";
import { apiUrl } from "../config/api";
import "./Enterprise.css";

function NotificationsPage() {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Set up polling for real-time updates
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [accessToken]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/api/notifications/"), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.results || []);
      setUnreadCount(data.results?.filter(n => !n.is_read).length || 0);
      
      // Show toast for new high-priority notifications
      const newHighPriority = data.results?.filter(n => !n.is_read && n.notification_type === 'ESCALATION');
      if (newHighPriority?.length > 0) {
        newHighPriority.forEach(notification => {
          toast.error(`Urgent: ${notification.title}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        });
      }
    } catch (error) {
      toast.error("Failed to load notifications", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(apiUrl(`/api/notifications/${notificationId}/read/`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success("Notification marked as read", {
          position: "top-right",
          autoClose: 2000,
        });
      }
    } catch (error) {
      toast.error("Failed to mark as read", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(apiUrl("/api/notifications/read_all/"), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read", {
          position: "top-right",
          autoClose: 2000,
        });
      }
    } catch (error) {
      toast.error("Failed to mark all as read", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const deleteNotification = async (notificationId) => {
    // Notifications are read-only, no delete functionality
    toast.info("Notifications cannot be deleted", {
      position: "top-right",
      autoClose: 2000,
    });
  };

  const getPriorityColor = (notificationType) => {
    switch (notificationType) {
      case 'ESCALATION': return 'status-danger';
      case 'SECURITY_ALERT': return 'status-danger';
      case 'APPROVAL': return 'status-warning';
      case 'INCIDENT': return 'status-warning';
      case 'TRANSFER': return 'status-neutral';
      case 'ASSIGNMENT': return 'status-neutral';
      case 'VERIFICATION': return 'status-success';
      case 'SYSTEM': return 'status-neutral';
      default: return 'status-neutral';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="page-shell">
      <ToastContainer />
      <div className="page-card">
        <div className="page-head">
          <div>
            <h2>Notifications</h2>
            <p>Real-time alerts and system updates</p>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount} unread</span>
            )}
          </div>
          <div className="notification-actions">
            <button 
              className="btn-small btn-primary" 
              onClick={fetchNotifications}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            {unreadCount > 0 && (
              <button 
                className="btn-small btn-secondary" 
                onClick={markAllAsRead}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="no-results">
            <h3>No notifications</h3>
            <p>You're all caught up! No new notifications at this time.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification.notification_id} 
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <span className={`priority-badge ${getPriorityColor(notification.notification_type)}`}>
                      {notification.notification_type}
                    </span>
                    <span className="notification-time">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <div className="notification-message">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                  </div>
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button 
                        className="btn-small btn-secondary"
                        onClick={() => markAsRead(notification.notification_id)}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
