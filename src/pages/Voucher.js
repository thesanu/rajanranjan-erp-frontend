import React, { useEffect, useState } from 'react';
import api from '../services/api';
import VoucherForm from '../components/VoucherForm';

const Voucher = () => {
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const loadData = async () => {
    try {
      const res = await api.get('/Voucher');
      setVouchers(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to load vouchers:', err);
      setError('Failed to load vouchers');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = async (voucher) => {
    try {
      const res = await api.get(`/Voucher/${voucher.voucherID}`);
      setSelectedVoucher(res.data);
      setShowForm(true);
    } catch (err) {
      console.error('Failed to fetch voucher:', err);
      alert('Could not fetch voucher details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this voucher?')) return;
    try {
      await api.delete(`/Voucher/${id}`);
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete voucher');
    }
  };

  const handleNew = () => {
    setSelectedVoucher(null);
    setShowForm(true);
  };

  const calculateAmount = (items) => {
    return Array.isArray(items)
      ? items.reduce((sum, i) => sum + (i.amount || 0), 0)
      : 0;
  };

  const currentItems = vouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(vouchers.length / itemsPerPage);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <h5>Vouchers</h5>
        <button className="btn btn-primary" onClick={handleNew}>+ New Voucher</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>Voucher No</th>
            <th>Date</th>
            <th>Type</th>
            <th>Narration</th>
            <th>Amount</th>
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((v) => (
            <tr key={v.voucherID}>
              <td>{v.voucherNo}</td>
              <td>{new Date(v.voucherDate).toLocaleDateString()}</td>
              <td>{v.voucherType?.voucherName}</td>
              <td>{v.narration}</td>
              <td>{calculateAmount(v.items).toFixed(2)}</td>
              <td>
                <button className="btn btn-sm btn-secondary me-2" onClick={() => handleEdit(v)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.voucherID)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav>
          <ul className="pagination justify-content-center">
            {Array.from({ length: totalPages }, (_, i) => (
              <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {showForm && (
        <VoucherForm
          data={selectedVoucher}
          onClose={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default Voucher;
