import React, { useState } from 'react';
import api from '../../services/api';  // adjust path as needed

const TrialBalance = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState([]);
  const [error, setError] = useState(null);

  const fetchTrialBalance = async () => {
    try {
      const res = await api.get('/reports/trial-balance', {
        params: { fromDate, toDate }
      });
      setReport(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching trial balance:', err);
      setError('Failed to load trial balance report');
      setReport([]);
    }
  };

  const totalDebit = report.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = report.reduce((sum, r) => sum + (r.credit || 0), 0);

  return (
    <div className="container mt-4">
      <h4>Trial Balance</h4>

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
          <button 
            className="btn btn-primary w-100" 
            onClick={fetchTrialBalance}
          >
            Generate
          </button>
        </div>
      </div>

      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>Ledger</th>
            <th className="text-end">Debit</th>
            <th className="text-end">Credit</th>
          </tr>
        </thead>
        <tbody>
          {report.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center">No entries found</td>
            </tr>
          ) : (
            report.map((entry, idx) => (
              <tr key={entry.id || idx}>
                <td>{entry.ledgerName || entry.LedgerName || 'N/A'}</td>
                <td className="text-end">{entry.debit?.toFixed(2)}</td>
                <td className="text-end">{entry.credit?.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
        {report.length > 0 && (
          <tfoot className="fw-bold">
            <tr>
              <td className="text-end">Total</td>
              <td className="text-end">{totalDebit.toFixed(2)}</td>
              <td className="text-end">{totalCredit.toFixed(2)}</td>
            </tr>
            {totalDebit !== totalCredit && (
              <tr className="table-danger">
                <td colSpan="3" className="text-center">
                  ⚠️ Trial balance mismatch: Difference = {(totalDebit - totalCredit).toFixed(2)}
                </td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TrialBalance;
