import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import "./LoginSingle.css";

function LoginSingle() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    if (error) {
      setError("");
    }

    setCredentials((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Local authentication for registered students (fallback)
  const authenticateLocalStudent = (username, password) => {
    try {
      console.log('=== LOCAL STUDENT AUTHENTICATION ===');
      console.log('Attempting local login for username:', username);
      
      const storedUser = localStorage.getItem('studentUser');
      console.log('Raw localStorage data:', storedUser);
      
      if (!storedUser) {
        console.log('❌ No student data found in localStorage');
        return null;
      }

      const user = JSON.parse(storedUser);
      console.log('Parsed user data:', user);
      
      if (user.username === username && user.password === password) {
        console.log('✅ Local credentials match! Creating session...');
        return {
          accessToken: 'local-token-' + Date.now(),
          refreshToken: 'local-refresh-' + Date.now(),
          role: user.role || 'STUDENT',
          username: user.username,
          email: user.email || `${user.username}@university.edu`,
          firstName: user.firstName,
          lastName: user.lastName,
          universityId: user.universityId,
          djangoRegistered: user.djangoproject || false
        };
      }
      
      console.log('❌ Local credentials do not match');
      return null;
    } catch (error) {
      console.error('❌ Local auth error:', error);
      return null;
    }
  };

  // Django backend authentication for all users including students
  const authenticateWithDjango = async (username, password) => {
    try {
      console.log('=== DJANGO BACKEND AUTHENTICATION ===');
      console.log('Attempting Django login for username:', username);
      
      const response = await fetch(apiUrl("/api/auth/login/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      console.log('Django response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Django error response:', errorData);
        return null;
      }

      const data = await response.json();
      console.log('✅ Django authentication successful:', data);
      
      return {
        access: data.access,
        refresh: data.refresh,
        role: data.user?.role || 'USER',
        username: data.user?.username || username,
        email: data.user?.email || '',
        firstName: data.user?.first_name || '',
        lastName: data.user?.last_name || '',
        universityId: data.user?.university_id || '',
        djangoRegistered: true,
        user: data.user
      };
      
    } catch (error) {
      console.error('❌ Django authentication error:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('=== HYBRID LOGIN ATTEMPT ===');
    console.log('Credentials:', {
      username: credentials.username.trim(),
      passwordLength: credentials.password.trim().length
    });

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const username = credentials.username.trim();
      const password = credentials.password.trim();

      // Try Django authentication first
      console.log('Trying Django authentication first...');
      const djangoUser = await authenticateWithDjango(username, password);
      
      if (djangoUser) {
        // Successful Django authentication
        console.log('✅ Django login successful for role:', djangoUser.role);
        
        let successMessage = "Login successful!";
        if (djangoUser.role === 'STUDENT') {
          successMessage = "Login successful! Welcome student.";
        } else if (djangoUser.role === 'ADMIN') {
          successMessage = "Login successful! Welcome admin.";
        }
        
        toast.success(successMessage, {
          position: "top-right",
          autoClose: 3000,
        });
        
        // Use the auth context to login with Django data
        login({
          access: djangoUser.access,
          refresh: djangoUser.refresh,
          role: djangoUser.role,
          username: djangoUser.username,
          email: djangoUser.email
        });
        
        // Redirect based on role
        if (djangoUser.role === 'STUDENT') {
          navigate("/student-dashboard");
        } else if (djangoUser.role === 'ADMIN') {
          navigate("/dashboard/admin");
        } else {
          navigate("/");
        }
        return;
      }

      // If Django fails, try local authentication for students
      console.log('Django failed, trying local authentication...');
      const localUser = authenticateLocalStudent(username, password);
      
      if (localUser) {
        // Successful local authentication
        console.log('✅ Local login successful for student');
        
        toast.success("Login successful! Welcome student (local mode).", {
          position: "top-right",
          autoClose: 3000,
        });
        
        // Use the auth context to login with local data
        login({
          access: localUser.accessToken,
          refresh: localUser.refreshToken,
          role: localUser.role,
          username: localUser.username,
          email: localUser.email
        });
        
        navigate("/student-dashboard");
        return;
      }

      // If both fail
      console.log('❌ Both Django and local authentication failed');
      setError("Invalid username or password. Please check your credentials or register a new account.");
      return;

    } catch (error) {
      console.error('❌ Login error:', error);
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-single-container">
      <ToastContainer />
      
      {/* Floating Particles */}
      <div className="particles">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>
      
      <div className="login-single-card">
        {/* Logo Section */}
        <div className="login-logo">
          <img src="/favicon.ico" alt="PMS Logo" className="logo-image" />
          <h1>Property Management System</h1>
          <p>University Access Portal</p>
        </div>

        {/* Login Form */}
        <div className="login-form-section">
          <h2>Welcome Back</h2>
          <p>Sign in to access your account</p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <div className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="spinner"></div>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Registration Options */}
          <div className="login-options">
            <div className="option-row">
              <div className="option-info">
                <h3>New Student?</h3>
                <p>Register your account and PC</p>
              </div>
              <Link to="/register/student/working" className="option-button primary">
                Register Now
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>&copy; 2026 PMS-HU. All rights reserved.</p>
            <div className="footer-links">
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginSingle;
