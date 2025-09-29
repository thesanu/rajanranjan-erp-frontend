// File: src/pages/Reports/ItemLedger.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ItemLedger = () => {
  const [productId, setProductId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!productId.trim()) {
      alert('Please enter a product ID');
      return;
    }

    try {
      const res = await axios.get('/api/reports/item-ledger', {
        params: { productId, fromDate, toDate },
      });

      setEntries(res.data.entries || []);
      setBalance(res.data.balance || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching item ledger:', err);
      setEntries([]);
      setBalance(0);
      setError('Failed to load item ledger');
    }
  };

  return (
    <div className="container mt-4">
      <h4>Item Ledger</h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label className="form-label">Product</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
        </div>
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
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-primary w-100" onClick={fetchData}>
            Generate
          </button>
        </div>
      </div>

      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Voucher No</th>
            <th className="text-end">Inward</th>
            <th className="text-end">Outward</th>
            <th className="text-end">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">No entries found</td>
            </tr>
          ) : (
            entries.map((entry, index) => (
              <tr key={index}>
                <td>{entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}</td>
                <td>{entry.voucherNo || '-'}</td>
                <td className="text-end">{entry.inward != null ? entry.inward.toFixed(2) : '-'}</td>
                <td className="text-end">{entry.outward != null ? entry.outward.toFixed(2) : '-'}</td>
                <td className="text-end">{entry.balance != null ? entry.balance.toFixed(2) : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="text-end fw-bold mt-2">
        Final Balance: {Number(balance).toFixed(2)}
      </div>
    </div>
  );
};

export default ItemLedger;
