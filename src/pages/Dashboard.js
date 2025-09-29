import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mt-4">
      <h2>Welcome, {user?.fullName || "User"} 👋</h2>
      <p className="text-muted">This is your ERP dashboard.</p>

      <div className="row mt-4">
        <div className="col-md-3 mb-3">
          <Link to="/account-group" className="btn btn-primary w-100">Masters</Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/voucher" className="btn btn-success w-100">Vouchers</Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/reports/ledger" className="btn btn-info w-100">Reports</Link>
        </div>
        <div className="col-md-3 mb-3">
          <Link to="/backup" className="btn btn-warning w-100">Utilities</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
