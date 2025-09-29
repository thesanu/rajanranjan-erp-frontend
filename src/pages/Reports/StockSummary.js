// File: src/pages/Reports/StockSummary.jsx
import React, { useState } from 'react';
import axios from 'axios';

const StockSummary = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await axios.get('/api/reports/stock-summary', {
        params: { fromDate, toDate },
      });
      setReport(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stock summary:', err);
      setReport([]);
      setError('Failed to load stock summary');
    }
  };

  const filteredReport = report.filter((item) =>
    item.productName?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="container mt-4">
      <h4>Stock Summary</h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label className="form-label">From Date</label>
          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">To Date</label>
          <input
            type="date"
            className="form-control"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Search Product</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter product name"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-primary w-100" onClick={fetchReport}>
            Generate
          </button>
        </div>
      </div>

      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>Product</th>
            <th className="text-end">Opening</th>
            <th className="text-end">Inward</th>
            <th className="text-end">Outward</th>
            <th className="text-end">Closing</th>
          </tr>
        </thead>
        <tbody>
          {filteredReport.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">
                No data found
              </td>
            </tr>
          ) : (
            filteredReport.map((item, index) => (
              <tr key={index}>
                <td>{item.productName}</td>
                <td className="text-end">{(item.opening ?? 0).toFixed(2)}</td>
                <td className="text-end">{(item.inward ?? 0).toFixed(2)}</td>
                <td className="text-end">{(item.outward ?? 0).toFixed(2)}</td>
                <td className="text-end">{(item.closing ?? 0).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StockSummary;
