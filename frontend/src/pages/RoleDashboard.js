import React from "react";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import PropertyOfficerDashboard from "./PropertyOfficerDashboard";
import DepartmentHeadDashboard from "./DepartmentHeadDashboard";
import SecurityDashboard from "./SecurityDashboard";
import UserDashboard from "./UserDashboard";

function RoleDashboard() {
  const { role } = useAuth();

  if (role === "ADMIN") {
    return <AdminDashboard />;
  }

  if (role === "PROPERTY_OFFICER") {
    return <PropertyOfficerDashboard />;
  }

  if (role === "DEPT_HEAD") {
    return <DepartmentHeadDashboard />;
  }

  if (role === "SECURITY") {
    return <SecurityDashboard />;
  }

  return <UserDashboard />;
}

export default RoleDashboard;
