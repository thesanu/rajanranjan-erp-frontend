import React, { useEffect, useState } from 'react';
import api from '../services/api'; // ✅ Ensure baseURL = "https://localhost:7235/api"

const OpeningBalance = () => {
  const [balances, setBalances] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [form, setForm] = useState({
    ledgerID: '',
    amount: '',
    type: 'Dr',
    entryDate: new Date().toISOString().split('T')[0], // default today
    remarks: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchData();
    fetchLedgers();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/OpeningBalance');
      setBalances(res.data);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const fetchLedgers = async () => {
    try {
      const res = await api.get('/Ledger');
      setLedgers(res.data);
    } catch (error) {
      console.error('Error loading ledgers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editId ? api.put : api.post;
    const url = editId ? `/OpeningBalance/${editId}` : '/OpeningBalance';

    const payload = {
      openingBalanceID: editId ?? 0,
      ledgerID: parseInt(form.ledgerID),
      amount: parseFloat(form.amount),
      type: form.type,
      entryDate: new Date(form.entryDate).toISOString(),
      remarks: form.remarks
    };

    try {
      await method(url, payload);
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/OpeningBalance/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Opening Balances</h5>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({
              ledgerID: '',
              amount: '',
              type: 'Dr',
              entryDate: new Date().toISOString().split('T')[0], // default today
              remarks: ''
            });
            setEditId(null);
            setShowModal(true);
          }}
        >
          + Add
        </button>
      </div>

      <table className="table table-bordered table-hover">
        <thead>
          <tr>
            <th>Ledger</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Date</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {balances.length > 0 ? (
            balances.map((b) => (
              <tr key={b.openingBalanceID}>
                <td>{ledgers.find((l) => l.ledgerID === b.ledgerID)?.ledgerName || 'Unknown'}</td>
                <td>{b.amount}</td>
                <td>{b.type}</td>
                <td>{new Date(b.entryDate).toLocaleDateString()}</td>
                <td>{b.remarks || '-'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary me-2"
                    onClick={() => {
                      setForm({
                        ledgerID: b.ledgerID.toString(),
                        amount: b.amount,
                        type: b.type,
                        entryDate: b.entryDate.split('T')[0],
                        remarks: b.remarks || ''
                      });
                      setEditId(b.openingBalanceID);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(b.openingBalanceID)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center">
                No opening balances found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="modal show fade d-block" tabIndex="-1">
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Edit' : 'Add'} Opening Balance</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label>Ledger</label>
                  <select
                    className="form-control"
                    value={form.ledgerID}
                    required
                    onChange={(e) => setForm({ ...form, ledgerID: e.target.value })}
                  >
                    <option value="">Select Ledger</option>
                    {ledgers.map((l) => (
                      <option key={l.ledgerID} value={l.ledgerID}>
                        {l.ledgerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label>Type</label>
                  <select
                    className="form-control"
                    value={form.type}
                    required
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={form.entryDate}
                    onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label>Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  {editId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningBalance;
