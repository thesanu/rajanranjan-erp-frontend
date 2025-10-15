import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export default function VoucherType() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [types, setTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('voucherName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    voucherName: '',
    prefix: '',
    suffix: '',
    startNumber: '',
    currentNumber: '',
    resetOn: '',
    companyProfileId: isGlobal ? '' : undefined,
    isActive: true
  });

  useEffect(() => {
    if (isGlobal) fetchCompanies();
    fetchTypes();
  }, [companyFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/CompanyProfile');
      setCompanies(res.data || []);
    } catch {
      setError('Failed to load companies.');
    }
  };

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/VoucherType';
      const params = new URLSearchParams();

      if (isAdmin && user?.companyId) {
        params.append('companyProfileId', user.companyId);
      }
      if (isGlobal && companyFilter) {
        params.append('companyProfileId', companyFilter);
      }
      // Include inactive items
      params.append('includeInactive', 'true');

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      setTypes(res.data || []);
    } catch {
      setError('Error loading voucher types.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      voucherName: '',
      prefix: '',
      suffix: '',
      startNumber: '',
      currentNumber: '',
      resetOn: '',
      companyProfileId: isGlobal ? '' : undefined,
      isActive: true
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      voucherName: row.voucherName || '',
      prefix: row.prefix || '',
      suffix: row.suffix || '',
      startNumber: row.startNumber || '',
      currentNumber: row.currentNumber || '',
      resetOn: row.resetOn || '',
      isActive: row.isActive ?? true,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {})
    });
    setShow(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      voucherName: form.voucherName.trim(),
      prefix: form.prefix,
      suffix: form.suffix,
      startNumber: Number(form.startNumber) || 0,
      currentNumber: Number(form.currentNumber) || 0,
      resetOn: form.resetOn,
      isActive: form.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(form.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { voucherTypeID: editing.voucherTypeID } : {})
    };

    try {
      if (editing) {
        await api.put(`/VoucherType/${editing.voucherTypeID}`, payload);
        toast.success('Voucher type updated');
      } else {
        await api.post('/VoucherType', payload);
        toast.success('Voucher type created');
      }
      setShow(false);
      fetchTypes();
    } catch {
      toast.error('Error saving voucher type.');
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this voucher type?',
      text: row.voucherName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;

    try {
      await api.delete(`/VoucherType/${row.voucherTypeID}`);
      toast.success('Voucher type deleted');
      fetchTypes();
    } catch {
      toast.error('Error deleting voucher type.');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...types];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.voucherName || '').toLowerCase().includes(q)
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
  }, [types, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ---- Export/Import ----
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VoucherTypes');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'voucher_types.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'voucher_types.csv');
  };

  const downloadSample = () => {
    const sample = [
      { voucherName: 'Sales Invoice', prefix: 'SI-', suffix: '', startNumber: 1, currentNumber: 1, resetOn: 'Yearly', isActive: true }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'voucher_type_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.voucherName) continue;
        try {
          await api.post('/VoucherType', {
            voucherName: r.voucherName,
            prefix: r.prefix,
            suffix: r.suffix,
            startNumber: Number(r.startNumber) || 0,
            currentNumber: Number(r.currentNumber) || 0,
            resetOn: r.resetOn,
            isActive: r.isActive ?? true,
            ...(isAdmin && user?.companyId ? { companyProfileId: user.companyId } : {})
          });
        } catch { }
      }
      toast.success('Import completed');
      fetchTypes();
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
        <h5 className="mb-0" style={{ color: 'rgba(17, 82, 73, 0.95)' }}>Voucher Type Master</h5>
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
              <th role="button" onClick={() => toggleSort('voucherName')}>Name <BsArrowDownUp className="ms-1" /></th>
              <th>Prefix</th>
              <th>Suffix</th>
              <th>Start No</th>
              <th>Current No</th>
              <th>Reset On</th>
              <th>Status</th>
              {isGlobal && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isGlobal ? 9 : 8} className="text-center py-4">
                  <BeatLoader size={10} color="#177366" />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={isGlobal ? 9 : 8} className="text-center">No data</td>
              </tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.voucherTypeID}>
                  <td>{r.voucherName}</td>
                  <td>{r.prefix}</td>
                  <td>{r.suffix}</td>
                  <td>{r.startNumber}</td>
                  <td>{r.currentNumber}</td>
                  <td>{r.resetOn}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '6px',
                      backgroundColor: r.isActive ? 'green' : 'red'
                    }}></span>
                  </td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || '-'}</td>}
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
          <Modal.Header closeButton className="custom-modal-header">
            <Modal.Title className="fs-6 modal-title-custom">
              {editing ? 'Edit Voucher Type' : 'New Voucher Type'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label>Voucher Name</Form.Label>
              <Form.Control
                value={form.voucherName}
                onChange={(e) => setForm({ ...form, voucherName: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Prefix</Form.Label>
              <Form.Control
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Suffix</Form.Label>
              <Form.Control
                value={form.suffix}
                onChange={(e) => setForm({ ...form, suffix: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Start Number</Form.Label>
              <Form.Control
                type="number"
                value={form.startNumber}
                onChange={(e) => setForm({ ...form, startNumber: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Current Number</Form.Label>
              <Form.Control
                type="number"
                value={form.currentNumber}
                onChange={(e) => setForm({ ...form, currentNumber: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Reset On</Form.Label>
              <Form.Control
                value={form.resetOn}
                onChange={(e) => setForm({ ...form, resetOn: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check
                type="switch"
                label={form.isActive ? "Active" : "Inactive"}
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label>Company</Form.Label>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={() => setShow(false)}>Cancel</Button>
            <Button type="submit" variant="success" size="sm">{editing ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <style>
        {`
          .modal-title-custom {
            color: #fff; /* white text */
          }
          .custom-modal-header {
            background-color: rgba(23,115,102,0.95);
            color: #fff;
          }
          .custom-modal-header .btn-close {
            filter: brightness(0) invert(1);
          }
        `}
      </style>
    </div>
  );
}
