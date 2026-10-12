import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import RoleDashboard from "./pages/RoleDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Properties from "./pages/Properties";
import PropertySearch from "./pages/PropertySearch";
import AddProperty from "./pages/AddProperty";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Assignments from "./pages/Assignments";
import Transfers from "./pages/Transfers";
import Incidents from "./pages/Incidents";
import Reports from "./pages/Reports";
import NotificationsPage from "./pages/NotificationsPage";
import Settings from "./pages/Settings";
import Verification from "./pages/Verification";
import StudentDevices from "./pages/StudentDevices";
import Login from "./pages/LoginSingle";
import StudentRegistration from "./pages/StudentRegistration";
import GuestLogin from "./pages/GuestLogin";
import GuestRegistration from "./pages/GuestRegistration";
import GuestDashboard from "./pages/GuestDashboard";
import GuestUserManagement from "./pages/GuestUserManagement";
import GuestPropertyAccess from "./pages/GuestPropertyAccess";
import GuestStatistics from "./pages/GuestStatistics";
import GuestManagement from "./pages/GuestManagement";
import AccessDenied from "./pages/AccessDenied";
import CreateAssignment from "./pages/CreateAssignment";
import UserManagement from "./pages/UserManagement";
import "./App.css";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isAuthenticated } = useAuth();

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const AppLayout = (
    <ProtectedRoute>
      <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onNavigate={closeSidebar}
        />
        <div className="app-main">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <div className="app-content">
            <Outlet />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register/student"
          element={<StudentRegistration />}
        />
        <Route
          path="/register/student/working"
          element={<StudentRegistration />}
        />
        <Route
          path="/guest-login"
          element={<GuestLogin />}
        />
        <Route
          path="/guest-register"
          element={<GuestRegistration />}
        />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route element={AppLayout}>
          <Route path="/" element={<RoleDashboard />} />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/property-officer"
            element={
              <ProtectedRoute allowedRoles={["PROPERTY_OFFICER"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/dept-head"
            element={
              <ProtectedRoute allowedRoles={["DEPT_HEAD"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/security"
            element={
              <ProtectedRoute allowedRoles={["SECURITY"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/it-officer"
            element={
              <ProtectedRoute allowedRoles={["IT_OFFICER"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute allowedRoles={["STAFF"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY", "IT_OFFICER", "STAFF"]}>
                <Properties />
              </ProtectedRoute>
            }
          />
          <Route path="/properties/search" element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY", "IT_OFFICER", "STAFF"]}>
                <PropertySearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/add"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER"]}>
                <AddProperty />
              </ProtectedRoute>
            }
          />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "STAFF"]}>
                <Assignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments/create"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER"]}>
                <CreateAssignment />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/transfers" 
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "STAFF"]}>
                <Transfers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/incidents" 
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY", "STAFF"]}>
                <Incidents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD"]}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER", "DEPT_HEAD", "SECURITY", "IT_OFFICER", "STAFF", "STUDENT"]}>
                <NotificationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/verification" 
            element={
              <ProtectedRoute allowedRoles={["SECURITY"]}>
                <Verification />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student-devices" 
            element={
              <ProtectedRoute allowedRoles={["STUDENT", "IT_OFFICER", "SECURITY"]}>
                <StudentDevices />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/guest-management"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SECURITY"]}>
                <GuestManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guest-property-access"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SECURITY"]} allowGuest={true}>
                <GuestPropertyAccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guest-statistics"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SECURITY"]} allowGuest={true}>
                <GuestStatistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROPERTY_OFFICER"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guest-dashboard"
            element={
              <ProtectedRoute allowGuest={true}>
                <GuestDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
