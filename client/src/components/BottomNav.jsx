import React from "react";
import { NavLink } from "react-router-dom";
import "./BottomNav.css"; // Assuming you have a CSS file for styling

const BottomNav = () => {
  return (
    <div className="mobile-bottom-nav">
      <NavLink to="/" className="nav-item">
        <span className="icon">📊</span>
        <span className="label">ড্যাশবোর্ড</span>
      </NavLink>

      <NavLink to="/shipment-list" className="nav-item">
        <span className="icon">📦</span>
        <span className="label">শিপমেন্ট</span>
      </NavLink>

      <NavLink to="/payment-allocation" className="nav-item">
        <span className="icon">💰</span>
        <span className="label">পেমেন্ট</span>
      </NavLink>

      <NavLink to="/agency-list" className="nav-item">
        <span className="icon">🏢</span>
        <span className="label">ব্রাঞ্চ</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
