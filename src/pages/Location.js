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
import { BeatLoader } from 'react-spinners';
const PAGE_SIZE = 10;

export default function Location() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('locationName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    locationName: '',
    description: '',
    isActive: true,
    companyProfileId: isGlobal ? '' : undefined
  });

  useEffect(() => {
    if (isGlobal) fetchCompanies();
    fetchLocations();
  }, [companyFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/CompanyProfile');
      setCompanies(res.data || []);
    } catch {
      setError('Failed to load companies.');
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Location';
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
      setLocations(res.data || []);
    } catch {
      setError('Error loading locations.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      locationName: '',
      description: '',
      isActive: true,
      companyProfileId: isGlobal ? '' : undefined
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      locationName: row.locationName || '',
      description: row.description || '',
      isActive: !!row.isActive,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {})
    });
    setShow(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      locationName: form.locationName.trim(),
      description: form.description.trim(),
      isActive: !!form.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(form.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { locationID: editing.locationID } : {})
    };

    try {
      if (editing) {
        await api.put(`/Location/${editing.locationID}`, payload);
        toast.success('Location updated');
      } else {
        await api.post('/Location', payload);
        toast.success('Location created');
      }
      setShow(false);
      fetchLocations();
    } catch {
      toast.error('Error saving location.');
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this location?',
      text: row.locationName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`/Location/${row.locationID}`);
      toast.success('Location deleted');
      fetchLocations();
    } catch {
      toast.error('Error deleting location.');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...locations];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.locationName || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
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
  }, [locations, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Locations');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'locations.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'locations.csv');
  };

  const downloadSample = () => {
    const sample = [
      { locationName: 'Warehouse A', description: 'Storage', isActive: true },
      { locationName: 'Factory B', description: 'Production unit', isActive: true }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'location_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.locationName) continue;
        try {
          await api.post('/Location', {
            locationName: String(r.locationName).trim(),
            description: String(r.description || '').trim(),
            isActive: String(r.isActive).toLowerCase() === 'true',
            ...(isAdmin && user?.companyId ? { companyProfileId: user.companyId } : {})
          });
        } catch { /* skip bad rows */ }
      }
      toast.success('Import completed');
      fetchLocations();
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
        <h5 className="mb-0" style={{ color: 'rgba(17, 82, 73, 0.95)' }}>Location Master</h5>
        <Button
          size="sm"
          onClick={openCreate}
          style={{
            backgroundColor: '#0d6efd',
            borderColor: '#0a58ca',
            borderRadius: '50px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem 0.75rem',
          }}
        >
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
              <th role="button" onClick={() => toggleSort('locationName')}>Location <BsArrowDownUp className="ms-1" /></th>
              <th>Description</th>
              {isGlobal && <th>Company</th>}
              <th>Active</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isGlobal ? 5 : 4} className="text-center py-4">
                  <BeatLoader size={10} color="#177366" />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={isGlobal ? 5 : 4} className="text-center">No data</td>
              </tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.locationID}>
                  <td>{r.locationName}</td>
                  <td>{r.description}</td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || '-'}</td>}
                  <td>{r.isActive ? 'Yes' : 'No'}</td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openEdit(r)}
                        style={{ backgroundColor: '#4CAF50', color: '#fff', borderRadius: '50px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => confirmDelete(r)}
                        style={{ backgroundColor: '#e02e2a', color: '#fff', borderRadius: '50px' }}
                      >
                        Delete
                      </button>
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
           <Modal.Header closeButton className="custom-modal-header">
            <Modal.Title className="fs-6 modal-title-custom">{editing ? 'Edit Location' : 'New Location'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Location Name</Form.Label>
              <Form.Control
                value={form.locationName}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Description</Form.Label>
              <Form.Control
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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

<style>
        {

          `.modal-title-custom {
  color: #fff; /* white text */
}

.custom-modal-header {
  background-color: rgba(23,115,102,0.95); /* your green */
  color: #fff;
}

/* Make close button icon white */
.custom-modal-header .btn-close {
  filter: brightness(0) invert(1);
}

          `
        }
      </style>

    </div>
  );
}