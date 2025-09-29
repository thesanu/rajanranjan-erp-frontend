import React, { useState } from 'react';
import api from '../services/api'; // Adjust the path if needed

const BackupTool = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    try {
      setLoading(true);
      setStatus('');
      const res = await api.post('/backup/backup'); // 👈 No need for full URL
      setStatus(res.data.message || 'Backup created successfully.');
    } catch (err) {
      console.error('Backup error:', err);
      setStatus('Failed to create backup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h4>Database Backup Tool</h4>
      <p className="text-muted">Click the button below to generate a backup of the ERP database.</p>

      <button
        className="btn btn-primary mb-3"
        onClick={handleBackup}
        disabled={loading}
      >
        {loading ? 'Backing up...' : 'Create Backup'}
      </button>

      {status && <div className="alert alert-info">{status}</div>}
    </div>
  );
};

export default BackupTool;
