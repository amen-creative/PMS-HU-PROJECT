import React, { useEffect, useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import "./Dashboard.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement
);

function Dashboard() {
  const { accessToken, user, role } = useAuth();
  const [properties, setProperties] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(apiUrl("/api/properties/"), {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const data = await response.json();
        setProperties(Array.isArray(data) ? data : []);

        const usersResponse = await fetch(apiUrl("/api/users/"), {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          }
        }).catch(() => null);

        if (usersResponse?.ok) {
          const users = await usersResponse.json();
          setTotalUsers(Array.isArray(users) ? users.length : 0);
        } else {
          setTotalUsers(0);
        }
      } catch (fetchError) {
        setError(fetchError.message || "Unable to fetch dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken]);

  const myProperties = useMemo(() => {
    if (!user) {
      return [];
    }
    return properties.filter((item) => {
      const createdByUsername =
        item.created_by_username || item.created_by_details?.username || item.owner_username;
      return createdByUsername && createdByUsername === user.username;
    });
  }, [properties, user]);

  const metrics = useMemo(() => {
    const total = properties.length;
    const mine = role === "USER" ? myProperties.length : myProperties.length || total;

    const locations = properties.reduce((acc, item) => {
      const location = item.location || item.category || "Unknown";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    const monthly = properties.reduce((acc, item) => {
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        return acc;
      }
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { total, mine, locations, monthly };
  }, [myProperties.length, properties, role]);

  const locationLabels = Object.keys(metrics.locations);
  const locationValues = Object.values(metrics.locations);
  const monthlyLabels = Object.keys(metrics.monthly).sort();
  const monthlyValues = monthlyLabels.map((label) => metrics.monthly[label]);

  const locationChartData = {
    labels: locationLabels,
    datasets: [
      {
        label: "Properties",
        data: locationValues,
        backgroundColor: "#2563eb",
        borderRadius: 8,
        maxBarThickness: 42
      }
    ]
  };

  const monthlyChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: "Monthly Uploads",
        data: monthlyValues,
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.2)",
        tension: 0.35,
        pointRadius: 3
      }
    ]
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Professional analytics for your property ecosystem.</p>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      <div className="dashboard-cards">
        <div className="metric-card">
          <span>Total Properties</span>
          <strong>{metrics.total}</strong>
        </div>
        <div className="metric-card">
          <span>Total Users</span>
          <strong>{totalUsers}</strong>
        </div>
        <div className="metric-card">
          <span>My Properties</span>
          <strong>{metrics.mine}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>Properties Per Location</h3>
          {loading ? (
            <p className="chart-placeholder">Loading chart...</p>
          ) : locationLabels.length === 0 ? (
            <p className="chart-placeholder">No location data available.</p>
          ) : (
            <Bar
              data={locationChartData}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } }
                }
              }}
            />
          )}
        </div>

        <div className="chart-card">
          <h3>Monthly Uploads</h3>
          {loading ? (
            <p className="chart-placeholder">Loading chart...</p>
          ) : monthlyLabels.length === 0 ? (
            <p className="chart-placeholder">No monthly upload data available.</p>
          ) : (
            <Line
              data={monthlyChartData}
              options={{
                plugins: { legend: { display: true } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
