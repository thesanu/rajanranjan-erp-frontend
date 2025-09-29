import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Button, Form, Table, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BsPlus, BsUpload, BsDownload, BsSearch, BsArrowDownUp } from 'react-icons/bs';
import api from '../services/api';

const PAGE_SIZE = 10;

export default function UserMaster() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'GlobalAdmin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('username');
  const [sortDir, setSortDir] = useState('asc');

  const fileInputRef = useRef(null);

  const schema = yup.object({
    username: yup.string().trim().required('Username is required'),
    passwordHash: yup.string().trim().required('Password is required'),
    fullName: yup.string().trim(),
    role: yup.string().oneOf(['User', 'Admin']).required('Role is required'),
    isActive: yup.boolean().default(true),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: '',
      passwordHash: '',
      fullName: '',
      role: 'User',
      isActive: true,
    }
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({
      username: '',
      passwordHash: '',
      fullName: '',
      role: 'User',
      isActive: true,
    });
    setShow(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    reset({
      username: user.username,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    const payload = { ...data };
    try {
      if (editing) {
        await api.put(`/users/${editing.userID}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      setShow(false);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    }
  };

  const confirmDelete = async (user) => {
    const res = await Swal.fire({
      title: 'Delete this user?',
      text: user.username,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/users/${user.userID}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...users];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = (a[sortKey] ?? '').toString().toLowerCase();
      const vb = (b[sortKey] ?? '').toString().toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [users, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'users.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'users.csv');
  };

  const downloadSample = () => {
    const sample = [{ username: 'john', passwordHash: 'pass123', fullName: 'John Doe', role: 'User', isActive: true }];
    const csv = Papa.unparse(sample);
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'users_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.username || !r.passwordHash) continue;
        try {
          await api.post('/users', r);
        } catch {}
      }
      toast.success('Import completed');
      fetchUsers();
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => processRows(res.data) });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      processRows(XLSX.utils.sheet_to_json(ws));
    } else {
      toast.error('Unsupported file type');
    }
  };

  return (
    <div className="container-fluid py-3">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-semibold mb-0">👤 User Master</h4>
        <Button
          size="sm"
          onClick={openCreate}
          style={{ backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
        >
          <BsPlus className="me-1" /> Add User
        </Button>
      </div>

      {/* Toolbar */}
      <div className="border p-2 bg-light rounded mb-3">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <InputGroup size="sm" className="flex-grow-1" style={{ maxWidth: '250px' }}>
            <InputGroup.Text><BsSearch /></InputGroup.Text>
            <Form.Control placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>
          <Button size="sm" onClick={exportCSV} style={{ backgroundColor: '#0dcaf0', borderColor: '#31d2f2', borderRadius: '50px', color: '#fff' }}>
            <BsDownload className="me-1" /> CSV
          </Button>
          <Button size="sm" onClick={exportExcel} style={{ backgroundColor: '#198754', borderColor: '#146c43', borderRadius: '50px', color: '#fff' }}>
            <BsDownload className="me-1" /> Excel
          </Button>
          <Button size="sm" onClick={downloadSample} style={{ backgroundColor: '#d4a017', borderColor: '#b3880e', borderRadius: '50px', color: '#fff' }}>
            Sample
          </Button>
          <Form.Group controlId="importUsers" className="mb-0">
            <Form.Label className="btn btn-sm mb-0" style={{ cursor: 'pointer', backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', color: '#fff' }}>
              <BsUpload className="me-1" /> Import
              <Form.Control ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onImportFile} hidden />
            </Form.Label>
          </Form.Group>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive border bg-white rounded shadow-sm">
        <Table hover size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th role="button" onClick={() => toggleSort('username')}>Username <BsArrowDownUp className="ms-1" /></th>
              <th role="button" onClick={() => toggleSort('fullName')}>Full Name <BsArrowDownUp className="ms-1" /></th>
              <th role="button" onClick={() => toggleSort('role')}>Role <BsArrowDownUp className="ms-1" /></th>
              <th>Active</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={5} className="text-center">No users found</td></tr>
            ) : (
              pageRows.map(u => (
                <tr key={u.userID}>
                  <td>{u.username}</td>
                  <td>{u.fullName}</td>
                  <td>{u.role}</td>
                  <td>{u.isActive ? 'Yes' : 'No'}</td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <Button size="sm" onClick={() => openEdit(u)} style={{ backgroundColor: '#4CAF50', borderRadius: '50px', color: '#fff' }}>Edit</Button>
                      <Button size="sm" onClick={() => confirmDelete(u)} style={{ backgroundColor: '#e02e2a', borderRadius: '50px', color: '#fff' }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </small>
        <div className="btn-group btn-group-sm">
          <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Modal */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">{editing ? 'Edit User' : 'New User'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Username</Form.Label>
              <Form.Control {...register('username')} isInvalid={!!errors.username} />
              <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" {...register('passwordHash')} isInvalid={!!errors.passwordHash} />
              <Form.Control.Feedback type="invalid">{errors.passwordHash?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Full Name</Form.Label>
              <Form.Control {...register('fullName')} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Role</Form.Label>
              <Form.Select {...register('role')} isInvalid={!!errors.role}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Check type="switch" label="Active" {...register('isActive')} className="mt-2" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={() => setShow(false)}>Cancel</Button>
            <Button variant="success" size="sm" type="submit" disabled={isSubmitting}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
