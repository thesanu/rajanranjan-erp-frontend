import React, { useState, useEffect } from 'react';
import api from '../../services/api';  // Adjust path to your api.js

const LedgerReport = () => {
  const [ledgers, setLedgers] = useState([]);
  const [ledgerID, setLedgerID] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  // Fetch ledger list from API
  useEffect(() => {
    api.get('/ledger')
      .then(res => {
        console.log('Ledger API response:', res.data);  // Debug
        setLedgers(res.data);
      })
      .catch(err => {
        console.error('Error fetching ledgers:', err);
        setError('Failed to load ledger list');
      });
  }, []);

  // Fetch ledger report on button click
  const fetchReport = async () => {
    if (!ledgerID) {
      alert('Please select a ledger');
      return;
    }
    try {
      const res = await api.get('/Reports/ledger', {
        params: {
          ledgerId: ledgerID,
          from: fromDate || undefined,
          to: toDate || undefined
        }
      });
      setEntries(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load ledger report');
      setEntries([]);
    }
  };

  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  return (
    <div className="container mt-4">
      <h4>Ledger Report</h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label">Ledger</label>
          <select
            className="form-select"
            value={ledgerID}
            onChange={(e) => setLedgerID(e.target.value)}
          >
            <option value="">Select Ledger</option>
            {ledgers.map(l => (
              // Use correct keys based on your API response property names
              <option key={l.ledgerID || l.LedgerID} value={l.ledgerID || l.LedgerID}>
                {l.ledgerName || l.LedgerName}
              </option>
            ))}
          </select>
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

        <div className="col-md-2 d-flex align-items-end">
          <button
            className="btn btn-primary w-100"
            onClick={fetchReport}
          >
            Search
          </button>
        </div>
      </div>

      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Voucher No</th>
            <th>Narration</th>
            <th className="text-end">Debit</th>
            <th className="text-end">Credit</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">No entries found</td>
            </tr>
          ) : (
            entries.map((e, idx) => (
              <tr key={e.id || idx}>
               <td>{e.voucherDate ? new Date(e.voucherDate).toLocaleDateString() : 'N/A'}</td>
                <td>{e.voucherNo}</td>
                <td>{e.narration}</td>
                <td className="text-end">{e.debit?.toFixed(2)}</td>
                <td className="text-end">{e.credit?.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
        {entries.length > 0 && (
          <tfoot className="fw-bold">
            <tr>
              <td colSpan="3" className="text-end">Total</td>
              <td className="text-end">{totalDebit.toFixed(2)}</td>
              <td className="text-end">{totalCredit.toFixed(2)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default LedgerReport;
