// File: src/pages/Reports/BalanceSheet.jsx
import React, { useState } from 'react';
import api from '../../services/api'; // Use centralized api instance
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const BalanceSheet = () => {
  const [onDate, setOnDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    if (!onDate) {
      alert('Please select a date');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/balance-sheet', {
        params: { onDate },
      });
      setReport(res.data);
    } catch (err) {
      console.error('Error fetching balance sheet report:', err);
      setError('Failed to load report. Please try again.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const assets = report?.assets ?? [];
  const liabilities = report?.liabilities ?? [];
  const totalAssets = report?.totalAssets ?? 0;
  const totalLiabilities = report?.totalLiabilities ?? 0;

  const chartData = {
    labels: ['Assets', 'Liabilities'],
    datasets: [
      {
        data: [totalAssets, totalLiabilities],
        backgroundColor: ['#2196f3', '#ff9800'],
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div className="container mt-4">
      <h4>Balance Sheet</h4>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label">As On Date</label>
          <input
            type="date"
            className="form-control"
            value={onDate}
            onChange={(e) => setOnDate(e.target.value)}
          />
        </div>
        <div className="col-md-6 d-flex align-items-end">
          <button
            className="btn btn-primary w-100"
            onClick={fetchReport}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Generate'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {report && (
        <>
          <div className="row mb-4">
            <div className="col-md-6">
              <h5>Assets</h5>
              <table className="table table-bordered">
                <tbody>
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center">No assets data</td>
                    </tr>
                  ) : (
                    assets.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td className="text-end">{item.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="fw-bold table-light">
                    <td>Total</td>
                    <td className="text-end">{totalAssets.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="col-md-6">
              <h5>Liabilities</h5>
              <table className="table table-bordered">
                <tbody>
                  {liabilities.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center">No liabilities data</td>
                    </tr>
                  ) : (
                    liabilities.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td className="text-end">{item.amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="fw-bold table-light">
                    <td>Total</td>
                    <td className="text-end">{totalLiabilities.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 offset-md-3">
              <Pie data={chartData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalanceSheet;
