import React, { useEffect, useMemo, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Modal, Button, Form, Table, InputGroup
} from 'react-bootstrap';
import {
  BsPlus, BsSearch, BsFilter, BsDownload, BsFileEarmarkArrowDown, BsUpload, BsArrowDownUp
} from 'react-icons/bs';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

const PAGE_SIZE = 10;

export default function Mill() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [mills, setMills] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('millName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    millName: '',
    contactPerson: '',
    mobile: '',
    isActive: true,
    companyProfileId: isGlobal ? '' : undefined
  });

  useEffect(() => {
    if (isGlobal) fetchCompanies();
    fetchMills();
  }, [companyFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/CompanyProfile');
      setCompanies(res.data || []);
    } catch {
      setError('Failed to load companies.');
    }
  };

  const fetchMills = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Mill';
      const params = new URLSearchParams();

      if (isAdmin && user?.companyId) {
        params.append('companyProfileId', user.companyId);
      }
      if (isGlobal && companyFilter) {
        params.append('companyProfileId', companyFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      setMills(res.data || []);
    } catch {
      setError('Error loading mills.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      millName: '',
      contactPerson: '',
      mobile: '',
      isActive: true,
      companyProfileId: isGlobal ? '' : undefined
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      millName: row.millName || '',
      contactPerson: row.contactPerson || '',
      mobile: row.mobile || '',
      isActive: !!row.isActive,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {})
    });
    setShow(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      millName: form.millName.trim(),
      contactPerson: form.contactPerson.trim(),
      mobile: form.mobile.trim(),
      isActive: !!form.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(form.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { millID: editing.millID } : {})
    };

    try {
      if (editing) {
        await api.put(`/Mill/${editing.millID}`, payload);
        toast.success('Mill updated');
      } else {
        await api.post('/Mill', payload);
        toast.success('Mill created');
      }
      setShow(false);
      fetchMills();
    } catch {
      toast.error('Error saving mill.');
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this mill?',
      text: row.millName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`/Mill/${row.millID}`);
      toast.success('Mill deleted');
      fetchMills();
    } catch {
      toast.error('Error deleting mill.');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...mills];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.millName || '').toLowerCase().includes(q) ||
        (r.contactPerson || '').toLowerCase().includes(q) ||
        (r.mobile || '').toLowerCase().includes(q)
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
  }, [mills, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mills');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'mills.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'mills.csv');
  };

  const downloadSample = () => {
    const sample = [
      { millName: 'ABC Mill', contactPerson: 'John', mobile: '9876543210', isActive: true },
      { millName: 'XYZ Mill', contactPerson: 'Alice', mobile: '9123456789', isActive: true }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'mill_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.millName) continue;
        try {
          await api.post('/Mill', {
            millName: String(r.millName).trim(),
            contactPerson: String(r.contactPerson || '').trim(),
            mobile: String(r.mobile || '').trim(),
            isActive: String(r.isActive).toLowerCase() === 'true',
            ...(isAdmin && user?.companyId ? { companyProfileId: user.companyId } : {})
          });
        } catch { /* skip bad rows */ }
      }
      toast.success('Import completed');
      fetchMills();
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data)
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      processRows(json);
    } else {
      toast.error('Unsupported file type');
    }
  };

  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      if (c.companyID != null && c.companyName) {
        map[c.companyID] = c.companyName;
      }
    });
    return map;
  }, [companies]);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
        <h5 className="mb-0">Mill Master</h5>
        <Button size="sm" onClick={openCreate} style={{ borderRadius: '50px' }}>
          <BsPlus className="me-1" /> Add
        </Button>
      </div>

      {/* Filters */}
      <div className="border p-2 bg-light mb-2">
        <div className="row gx-2 gy-2 align-items-center">
          {isGlobal && (
            <div className="col-auto">
              <InputGroup size="sm">
                <InputGroup.Text><BsFilter /></InputGroup.Text>
                <Form.Select
                  value={companyFilter}
                  onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>
                      {c.companyName} ({c.companyID})
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </div>
          )}

          <div className="col-auto">
            <InputGroup size="sm">
              <InputGroup.Text><BsSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </InputGroup>
          </div>

          {/* Export & Import */}
          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button size="sm" onClick={exportCSV} style={{ borderRadius: '50px' }}>
              <BsDownload className="me-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportExcel} variant="success" style={{ borderRadius: '50px' }}>
              <BsDownload className="me-1" /> Excel
            </Button>
            <Button size="sm" onClick={downloadSample} variant="warning" style={{ borderRadius: '50px' }}>
              <BsFileEarmarkArrowDown className="me-1" /> Sample
            </Button>
            <Form.Group controlId="import" className="mb-0">
              <Form.Label className="btn btn-sm btn-primary mb-0" style={{ borderRadius: '50px' }}>
                <BsUpload /> Import
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={onImportFile}
                  hidden
                />
              </Form.Label>
            </Form.Group>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive border bg-white">
        <Table hover size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th role="button" onClick={() => toggleSort('millName')}>Mill <BsArrowDownUp className="ms-1" /></th>
              <th>Contact Person</th>
              <th>Mobile</th>
              {isGlobal && <th>Company</th>}
              <th>Active</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isGlobal ? 6 : 5}>Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={isGlobal ? 6 : 5} className="text-center">No data</td></tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.millID}>
                  <td>{r.millName}</td>
                  <td>{r.contactPerson}</td>
                  <td>{r.mobile}</td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || '-'}</td>}
                  <td>{r.isActive ? 'Yes' : 'No'}</td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button className="btn btn-sm btn-success" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(r)}>Delete</button>
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

      {/* Modal Form */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">{editing ? 'Edit Mill' : 'New Mill'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Mill Name</Form.Label>
              <Form.Control
                value={form.millName}
                onChange={(e) => setForm({ ...form, millName: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Contact Person</Form.Label>
              <Form.Control
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Mobile</Form.Label>
              <Form.Control
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label className="mb-1">Company</Form.Label>
                <Form.Select
                  value={form.companyProfileId}
                  onChange={(e) => setForm({ ...form, companyProfileId: e.target.value })}
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>
                      {c.companyName} ({c.companyID})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            <Form.Check
              type="switch"
              label="Is Active"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="mt-2"
            />
          </Modal.Body>
          <Modal.Footer className="py-2">
            <Button variant="secondary" size="sm" onClick={() => setShow(false)} style={{ borderRadius: '50px' }}>
              Cancel
            </Button>
            <Button type="submit" variant="success" size="sm" style={{ borderRadius: '50px' }}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
