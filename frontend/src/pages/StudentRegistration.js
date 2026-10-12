import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";
import { toast, ToastContainer } from "../utils/toast";
import "./Enterprise.css";
import "./StudentRegistration.css";

function StudentRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Student information
  const [studentData, setStudentData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    universityId: "",
    phoneNumber: "",
    department: "",
    yearOfStudy: "1"
  });

  // Photo uploads (UC-07 Steps 4-5)
  const [photoUrl, setPhotoUrl] = useState(null);
  const [pcImageUrl, setPcImageUrl] = useState(null);
  
  // PC information
  const [pcData, setPcData] = useState({
    title: "",
    category: "PC",
    serialNumber: "",
    model: "",
    description: ""
  });
  
  // Validation states
  const [validation, setValidation] = useState({
    username: { valid: null, message: "" },
    universityId: { valid: null, message: "" },
    serialNumber: { valid: null, message: "" }
  });

  // Check username availability
  const checkUsername = async (username) => {
    if (!username) {
      setValidation(prev => ({
        ...prev,
        username: { valid: null, message: "" }
      }));
      return;
    }
    
    try {
      const response = await fetch(apiUrl("/api/users/check/username/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      setValidation(prev => ({
        ...prev,
        username: {
          valid: data.available,
          message: data.message
        }
      }));
    } catch (error) {
      console.error("Username check failed:", error);
      setValidation(prev => ({
        ...prev,
        username: { valid: false, message: "Username check failed" }
      }));
    }
  };

  // Check university ID availability
  const checkUniversityId = async (universityId) => {
    if (!universityId) {
      setValidation(prev => ({
        ...prev,
        universityId: { valid: null, message: "" }
      }));
      return;
    }
    
    try {
      const response = await fetch(apiUrl("/api/users/check/university-id/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university_id: universityId })
      });
      
      const data = await response.json();
      setValidation(prev => ({
        ...prev,
        universityId: {
          valid: data.available,
          message: data.message
        }
      }));
    } catch (error) {
      console.error("University ID check failed:", error);
      setValidation(prev => ({
        ...prev,
        universityId: { valid: false, message: "University ID check failed" }
      }));
    }
  };

  // Check PC serial number availability
  const checkSerialNumber = async (serialNumber) => {
    if (!serialNumber) {
      setValidation(prev => ({
        ...prev,
        serialNumber: { valid: null, message: "" }
      }));
      return;
    }
    
    try {
      const response = await fetch(apiUrl("/api/users/check/pc-serial/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial_number: serialNumber })
      });
      
      const data = await response.json();
      setValidation(prev => ({
        ...prev,
        serialNumber: {
          valid: data.available,
          message: data.message
        }
      }));
    } catch (error) {
      console.error("Serial number check failed:", error);
      setValidation(prev => ({
        ...prev,
        serialNumber: { valid: false, message: "Serial number check failed" }
      }));
    }
  };

  // Handle student data changes
  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    if (name === "username") {
      checkUsername(value);
    } else if (name === "universityId") {
      checkUniversityId(value);
    }
  };

  // Handle PC data changes
  const handlePcChange = (e) => {
    const { name, value } = e.target;
    setPcData(prev => ({ ...prev, [name]: value }));
    
    if (name === "serialNumber") {
      checkSerialNumber(value);
    }
  };

  // Validate current step
  const validateStep = () => {
    console.log("Validating step:", currentStep);
    console.log("Student data:", studentData);
    console.log("Validation state:", validation);
    
    if (currentStep === 1) {
      // Validate student information
      const required = ["username", "email", "password", "confirmPassword", "firstName", "lastName", "universityId"];
      for (const field of required) {
        if (!studentData[field]) {
          console.log("Missing required field:", field);
          toast.error(`${field.replace(/([A-Z])/g, ' $1').trim()} is required`, {
            position: "top-right",
            autoClose: 3000,
          });
          return false;
        }
      }
      
      if (studentData.password !== studentData.confirmPassword) {
        toast.error("Passwords do not match", {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }
      
      if (studentData.password.length < 8) {
        toast.error("Password must be at least 8 characters", {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }
      
      // Check validation - handle null states properly
      const usernameValid = validation.username.valid === true;
      const universityIdValid = validation.universityId.valid === true;
      
      console.log("Validation checks:", {
        usernameValid,
        universityIdValid,
        usernameValidation: validation.username,
        universityIdValidation: validation.universityId
      });
      
      // Temporary bypass: allow registration if validation failed due to API issues
      const hasValidationError = validation.username.valid === false || validation.universityId.valid === false;
      const hasApiError = validation.username.message?.includes("check failed") || validation.universityId.message?.includes("check failed");
      
      if (hasValidationError && !hasApiError) {
        const errors = [];
        if (!usernameValid && validation.username.message) {
          errors.push(validation.username.message);
        }
        if (!universityIdValid && validation.universityId.message) {
          errors.push(validation.universityId.message);
        }
        
        console.log("Validation errors:", errors);
        toast.error(errors.join(" ") || "Please fix validation errors", {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }
      
      // If API validation failed, show warning but allow continuation
      if (hasApiError) {
        console.log("API validation failed, allowing continuation");
        toast.warning("Validation checks failed, but you can continue. Server will validate during registration.", {
          position: "top-right",
          autoClose: 5000,
        });
      }
    }
    
    if (currentStep === 2) {
      // Validate PC information
      const required = ["title", "serialNumber"];
      for (const field of required) {
        if (!pcData[field]) {
          toast.error(`${field.replace(/([A-Z])/g, ' $1').trim()} is required`, {
            position: "top-right",
            autoClose: 3000,
          });
          return false;
        }
      }
      
      // Check serial number validation - handle null states properly
      const serialNumberValid = validation.serialNumber.valid === true;
      const hasSerialApiError = validation.serialNumber.message?.includes("check failed");
      
      if (!serialNumberValid && !hasSerialApiError) {
        const errorMessage = validation.serialNumber.message || "Please fix validation errors";
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 3000,
        });
        return false;
      }
      
      // If API validation failed, show warning but allow continuation
      if (hasSerialApiError) {
        console.log("PC serial validation failed, allowing continuation");
        toast.warning("PC serial validation failed, but you can continue. Server will validate during registration.", {
          position: "top-right",
          autoClose: 5000,
        });
      }
    }
    
    return true;
  };

  // Next step
  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Previous step
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep()) return;
    
    setLoading(true);
    
    try {
      // Use FormData for file upload support (UC-07 Steps 4-5)
      const formData = new FormData();
      formData.append("username", studentData.username);
      formData.append("email", studentData.email);
      formData.append("password", studentData.password);
      formData.append("first_name", studentData.firstName);
      formData.append("last_name", studentData.lastName);
      formData.append("university_id", studentData.universityId);
      formData.append("phone_number", studentData.phoneNumber);
      formData.append("department", studentData.department);
      formData.append("year_of_study", studentData.yearOfStudy);

      // PC data
      formData.append("pc_title", pcData.title);
      formData.append("pc_category", pcData.category);
      formData.append("serial_number", pcData.serialNumber);
      formData.append("model", pcData.model);
      formData.append("description", pcData.description);

      // UC-07 Step 4: Profile photograph
      if (photoUrl) formData.append("photo_url", photoUrl);
      // UC-07 Step 5: PC image showing serial number label
      if (pcImageUrl) formData.append("pc_image_url", pcImageUrl);

      const response = await fetch(apiUrl("/api/users/register/student/"), {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success("Registration successful! Redirecting to login...", {
          position: "top-right",
          autoClose: 3000,
        });
        
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        throw new Error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      
      let errorMessage = "Registration failed";
      
      // Handle specific error types
      if (error.message) {
        if (error.message.includes('JSON') || error.message.includes('unexpected token')) {
          errorMessage = "Server error: Invalid data format. Please try again.";
        } else if (error.message.includes('already exists') || error.message.includes('already taken')) {
          errorMessage = error.message;
        } else if (error.message.includes('required')) {
          errorMessage = "Please fill in all required fields.";
        } else {
          errorMessage = error.message;
        }
      } else if (error.name === 'TypeError' && error.message.includes('JSON')) {
        errorMessage = "Server communication error. Please check your connection and try again.";
      }
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className={`step ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
        <div className="step-number">1</div>
        <div className="step-label">Student Information</div>
      </div>
      <div className="step-connector"></div>
      <div className={`step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
        <div className="step-number">2</div>
        <div className="step-label">PC Registration</div>
      </div>
      <div className="step-connector"></div>
      <div className={`step ${currentStep >= 3 ? "active" : ""}`}>
        <div className="step-number">3</div>
        <div className="step-label">Review & Submit</div>
      </div>
    </div>
  );

  const renderStudentInfo = () => (
    <div className="registration-form">
      <h2>Student Information</h2>
      
      <div className="form-row">
        <div className="form-group">
          <label>Username *</label>
          <input
            type="text"
            name="username"
            value={studentData.username}
            onChange={handleStudentChange}
            placeholder="Choose a username"
            className={validation.username.valid === false ? "error" : ""}
          />
          {validation.username.message && (
            <small className={validation.username.valid ? "success" : "error"}>
              {validation.username.message}
            </small>
          )}
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={studentData.email}
            onChange={handleStudentChange}
            placeholder="your.email@university.edu"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>First Name *</label>
          <input
            type="text"
            name="firstName"
            value={studentData.firstName}
            onChange={handleStudentChange}
            placeholder="Your first name"
          />
        </div>
        <div className="form-group">
          <label>Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={studentData.lastName}
            onChange={handleStudentChange}
            placeholder="Your last name"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>University ID *</label>
        <input
          type="text"
          name="universityId"
          value={studentData.universityId}
          onChange={handleStudentChange}
          placeholder="Your university ID number"
          className={validation.universityId.valid === false ? "error" : ""}
        />
        {validation.universityId.message && (
          <small className={validation.universityId.valid ? "success" : "error"}>
            {validation.universityId.message}
          </small>
        )}
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={studentData.password}
            onChange={handleStudentChange}
            placeholder="Create a password (min 8 characters)"
          />
        </div>
        <div className="form-group">
          <label>Confirm Password *</label>
          <input
            type="password"
            name="confirmPassword"
            value={studentData.confirmPassword}
            onChange={handleStudentChange}
            placeholder="Re-enter your password"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={studentData.phoneNumber}
            onChange={handleStudentChange}
            placeholder="Your phone number"
          />
        </div>
        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            name="department"
            value={studentData.department}
            onChange={handleStudentChange}
            placeholder="Your department"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Year of Study *</label>
          <select
            name="yearOfStudy"
            value={studentData.yearOfStudy}
            onChange={handleStudentChange}
          >
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
          </select>
        </div>
        <div className="form-group">
          <label>Profile Photograph * (front-facing, plain background)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoUrl(e.target.files[0] || null)}
          />
          {photoUrl && <small className="success">Photo selected: {photoUrl.name}</small>}
        </div>
      </div>
    </div>
  );

  const renderPcInfo = () => (
    <div className="registration-form">
      <h2>PC Registration</h2>
      
      <div className="form-group">
        <label>PC Title *</label>
        <input
          type="text"
          name="title"
          value={pcData.title}
          onChange={handlePcChange}
          placeholder="e.g., My Laptop, Office PC"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Category *</label>
          <select name="category" value={pcData.category} onChange={handlePcChange}>
            <option value="PC">Desktop PC</option>
            <option value="LAPTOP">Laptop</option>
            <option value="COMPUTER">Computer</option>
          </select>
        </div>
        <div className="form-group">
          <label>Serial Number *</label>
          <input
            type="text"
            name="serialNumber"
            value={pcData.serialNumber}
            onChange={handlePcChange}
            placeholder="PC serial number"
            className={validation.serialNumber.valid === false ? "error" : ""}
          />
          {validation.serialNumber.message && (
            <small className={validation.serialNumber.valid ? "success" : "error"}>
              {validation.serialNumber.message}
            </small>
          )}
        </div>
      </div>
      
      <div className="form-group">
        <label>Model</label>
        <input
          type="text"
          name="model"
          value={pcData.model}
          onChange={handlePcChange}
          placeholder="PC model (e.g., Dell XPS 15, MacBook Pro)"
        />
      </div>
      
      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={pcData.description}
          onChange={handlePcChange}
          placeholder="Describe your PC (specs, color, etc.)"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Device Photo * (clearly showing the serial number label)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPcImageUrl(e.target.files[0] || null)}
        />
        {pcImageUrl && <small className="success">Photo selected: {pcImageUrl.name}</small>}
        <small style={{ color: "#64748b", marginTop: 4, display: "block" }}>
          Take a clear photo of your computer showing the serial number label for cross-check verification
        </small>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="registration-review">
      <h2>Review Your Information</h2>
      
      <div className="review-section">
        <h3>Student Information</h3>
        <div className="review-grid">
          <div className="review-item">
            <label>Name:</label>
            <span>{studentData.firstName} {studentData.lastName}</span>
          </div>
          <div className="review-item">
            <label>Username:</label>
            <span>{studentData.username}</span>
          </div>
          <div className="review-item">
            <label>Email:</label>
            <span>{studentData.email}</span>
          </div>
          <div className="review-item">
            <label>University ID:</label>
            <span>{studentData.universityId}</span>
          </div>
          <div className="review-item">
            <label>Department:</label>
            <span>{studentData.department || "Not specified"}</span>
          </div>
          <div className="review-item">
            <label>Phone:</label>
            <span>{studentData.phoneNumber || "Not specified"}</span>
          </div>
          <div className="review-item">
            <label>Year of Study:</label>
            <span>{studentData.yearOfStudy}{studentData.yearOfStudy === "1" ? "st" : studentData.yearOfStudy === "2" ? "nd" : studentData.yearOfStudy === "3" ? "rd" : "th"} Year</span>
          </div>
          <div className="review-item">
            <label>Profile Photo:</label>
            <span>{photoUrl ? photoUrl.name : "Not uploaded"}</span>
          </div>
        </div>
      </div>
      
      <div className="review-section">
        <h3>PC Information</h3>
        <div className="review-grid">
          <div className="review-item">
            <label>Title:</label>
            <span>{pcData.title}</span>
          </div>
          <div className="review-item">
            <label>Category:</label>
            <span>{pcData.category}</span>
          </div>
          <div className="review-item">
            <label>Serial Number:</label>
            <span>{pcData.serialNumber}</span>
          </div>
          <div className="review-item">
            <label>Model:</label>
            <span>{pcData.model || "Not specified"}</span>
          </div>
          <div className="review-item full-width">
            <label>Description:</label>
            <span>{pcData.description || "Not specified"}</span>
          </div>
          <div className="review-item">
            <label>Device Photo:</label>
            <span>{pcImageUrl ? pcImageUrl.name : "Not uploaded"}</span>
          </div>
        </div>
      </div>
      
      <div className="review-notice">
        <p>By submitting this registration, you confirm that:</p>
        <ul>
          <li>All information provided is accurate</li>
          <li>You are the owner of this PC/device</li>
          <li>You will follow university policies for device usage</li>
          <li>Your device will be placed in the cross-check queue for IT Officer verification</li>
          <li>You understand that your device will be verified at campus gates once approved</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="enterprise-container">
      <ToastContainer />
      <div className="registration-page">
        <div className="registration-header">
          <h1>Student Registration</h1>
          <p>Register your account and PC for university access</p>
        </div>
        
        {renderStepIndicator()}
        
        <form onSubmit={handleSubmit} className="registration-form-container">
          {currentStep === 1 && renderStudentInfo()}
          {currentStep === 2 && renderPcInfo()}
          {currentStep === 3 && renderReview()}
          
          <div className="form-actions">
            {currentStep > 1 && (
              <button type="button" onClick={prevStep} className="btn-secondary">
                Previous
              </button>
            )}
            
            {currentStep < 3 && (
              <button type="button" onClick={nextStep} className="btn-primary">
                Next
              </button>
            )}
            
            {currentStep === 3 && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            )}
          </div>
        </form>
        
        <div className="registration-footer">
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
}

export default StudentRegistration;
