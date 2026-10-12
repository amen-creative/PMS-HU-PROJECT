import React from "react";
import logo from "../assets/logo.png"; // or .svg if you have it

function BrandLogo({ compact = false, className = "" }) {
  return (
    <div className={`brand-logo ${compact ? "is-compact" : ""} ${className}`.trim()}>
      
      <img 
        src={logo} 
        alt="Haramaya PMS Logo" 
        className="brand-logo-mark"
      />

      {!compact && (
        <div className="brand-logo-copy">
          <strong>Haramaya PMS</strong>
          <span>Property Management System</span>
        </div>
      )}

    </div>
  );
}

export default BrandLogo;