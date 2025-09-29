// File: src/pages/Reports/TransactionSummary.jsx
import React, { useState } from 'react';
import axios from 'axios';

const TransactionSummary = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    try {
      const res = await axios.get('/api/reports/transaction-summary', {
        params: { fromDate, toDate },
      });
      setTransactions(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching transaction summary:', err);
      setTransactions([]);
      setError('Failed to load transaction summary');
    }
  };

  return (
    <div className="container mt-4">
      <h4>Transaction Summary</h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label">From Date</label>
          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">To Date</label>
          <input
            type="date"
            className="form-control"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <button className="btn btn-primary w-100" onClick={fetchSummary}>
            Generate
          </button>
        </div>
      </div>

      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Voucher No</th>
            <th>Voucher Type</th>
            <th className="text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center">No transactions found</td>
            </tr>
          ) : (
            transactions.map((txn, index) => (
              <tr key={index}>
                <td>{txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}</td>
                <td>{txn.voucherNo || '-'}</td>
                <td>{txn.voucherType || '-'}</td>
                <td className="text-end">{txn.amount != null ? txn.amount.toFixed(2) : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionSummary;
