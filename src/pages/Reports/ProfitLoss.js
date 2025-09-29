// File: src/pages/Reports/ProfitLoss.jsx
import React, { useState } from 'react';
import api from '../../services/api';  // Use your centralized api instance
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ProfitLoss = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both From and To dates.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/reports/profit-loss', {
        params: { fromDate, toDate },
      });
      setReport(res.data);
    } catch (err) {
      console.error('Error fetching profit-loss report:', err);
      setError('Failed to load report. Please try again.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const income = report?.income ?? 0;
  const expense = report?.expense ?? 0;
  const netProfit = report?.netProfit ?? (income - expense);

  const chartData = {
    labels: ['Income', 'Expense'],
    datasets: [
      {
        label: 'Amount',
        data: [income, expense],
        backgroundColor: ['#4caf50', '#f44336'],
      },
    ],
  };

  return (
    <div className="container mt-4">
      <h4>Profit & Loss Report</h4>

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
          <Bar data={chartData} className="mb-4" />
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Income</td>
                <td className="text-end">{income.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Expense</td>
                <td className="text-end">{expense.toFixed(2)}</td>
              </tr>
              <tr className="table-info fw-bold">
                <td>Net Profit</td>
                <td className="text-end">{netProfit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default ProfitLoss;
