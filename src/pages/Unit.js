import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Button, Form, Table, InputGroup } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { BsPlus, BsSearch, BsArrowDownUp, BsUpload, BsDownload, BsFileEarmarkArrowDown, BsFilter } from 'react-icons/bs';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import api from '../services/api';

const PAGE_SIZE = 10;

export default function UnitMaster() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [units, setUnits] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('unitName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  const schema = yup.object({
    unitName: yup.string().trim().required('Unit name is required'),
    symbol: yup.string().nullable(),
    description: yup.string().nullable(),
    ...(isGlobal && {
      companyProfileId: yup
        .number()
        .typeError('Company ID must be a number')
        .required('Company ID is required'),
    }),
    isDefault: yup.boolean(),  // Add validation for isDefault
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      unitName: '',
      symbol: '',
      description: '',
      companyProfileId: isGlobal ? '' : undefined,
      isDefault: false,  // Default value for isDefault
    }
  });

  useEffect(() => {
    const loadCompanies = async () => {
      if (!isGlobal) return;
      try {
        const res = await api.get('/CompanyProfile');
        setCompanies(res.data || []);
      } catch (e) {
        console.error('Failed to load companies', e);
      }
    };
    loadCompanies();
  }, [isGlobal]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Unit';
      const params = new URLSearchParams();

      // Admins see their own company
      if (isAdmin && user?.companyId) {
        params.append('companyProfileId', user.companyId);
      }

      // GlobalAdmin can choose filter
      if (isGlobal && companyFilter && !isNaN(companyFilter)) {
        params.append('companyProfileId', companyFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      setUnits(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load units');
      toast.error(err?.response?.data?.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUnits(); }, [companyFilter]);

  const openCreate = () => {
    setEditing(null);
    reset({
      unitName: '',
      symbol: '',
      description: '',
      companyProfileId: isGlobal ? '' : undefined
    });

    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({
      unitName: row.unitName || '',
      symbol: row.symbol || '',
      description: row.description || '',
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {}),
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      unitName: data.unitName.trim(),
      symbol: data.symbol?.trim() || '',
      description: data.description?.trim() || '',
      isDefault: data.isDefault,  // Include isDefault in the payload
      ...(isGlobal
        ? { companyProfileId: Number(data.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { unitID: editing.unitID } : {}),
    };

    try {
      if (editing) {
        await api.put(`/Unit/${editing.unitID}`, payload);
        toast.success('Unit updated');
      } else {
        await api.post('/Unit', payload);
        toast.success('Unit created');
      }
      setShow(false);
      fetchUnits();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Save failed');
    }
  };


  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this unit?',
      text: row.unitName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/Unit/${row.unitID}`);
      toast.success('Unit deleted');
      fetchUnits();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let rows = [...units];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.unitName || '').toLowerCase().includes(q) ||
        (r.symbol || '').toLowerCase().includes(q)
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
  }, [units, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'units.csv');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Units');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'units.xlsx');
  };

  const downloadSample = () => {
    const sample = [{ unitName: 'Kilogram', symbol: 'kg', ...(isGlobal ? { companyProfileId: '' } : {}) }];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'unit_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.unitName) continue;
        try {
          await api.post('/Unit', {
            unitName: String(r.unitName).trim(),
            symbol: String(r.symbol || '').trim(),
            ...(isGlobal && r.companyProfileId ? { companyProfileId: Number(r.companyProfileId) } : {}),
            ...(isAdmin && user?.companyId ? { companyProfileId: Number(user.companyId) } : {}),
          });
        } catch (err) {
          // skip row errors
        }
      }
      toast.success('Import completed');
      fetchUnits();
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
      if (c.companyID != null && c.companyName) map[c.companyID] = c.companyName;
    });
    return map;
  }, [companies]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
        <h5 className="mb-0">Units</h5>
        <Button size="sm" onClick={openCreate} style={{ backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)' }}>
          <BsPlus className="me-1" /> Add
        </Button>
      </div>

      <div className="border p-2 bg-light mb-2">
        <div className="row gx-2 gy-2 align-items-center">
          {isGlobal && (
            <div className="col-auto">
              <InputGroup size="sm">
                <InputGroup.Text><BsFilter /></InputGroup.Text>
                <Form.Select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}>
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>{c.companyName} ({c.companyID})</option>
                  ))}
                </Form.Select>
              </InputGroup>
            </div>
          )}

          <div className="col-auto">
            <InputGroup size="sm">
              <InputGroup.Text><BsSearch /></InputGroup.Text>
              <Form.Control placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </InputGroup>
          </div>

          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button size="sm" onClick={exportCSV} style={{ backgroundColor: '#0dcaf0', borderColor: '#31d2f2', borderRadius: '50px', color: '#fff' }}><BsDownload className="me-1" /> CSV</Button>
            <Button size="sm" onClick={exportExcel} style={{ backgroundColor: '#198754', borderColor: '#146c43', borderRadius: '50px', color: '#fff' }}><BsDownload className="me-1" /> Excel</Button>
            <Button size="sm" onClick={downloadSample} style={{ backgroundColor: '#d4a017', borderColor: '#b3880e', borderRadius: '50px', color: '#fff' }}><BsFileEarmarkArrowDown className="me-1" /> Sample</Button>
            <Form.Group controlId="import" className="mb-0">
              <Form.Label className="btn btn-sm mb-0" style={{ cursor: 'pointer', backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', color: '#fff' }}>
                <BsUpload /> Import
                <Form.Control ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onImportFile} hidden />
              </Form.Label>
            </Form.Group>
          </div>
        </div>
      </div>

      <div className="table-responsive border bg-white">
        <Table hover size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th role="button" onClick={() => toggleSort('unitName')}>Unit Name <BsArrowDownUp className="ms-1" /></th>
              <th role="button" onClick={() => toggleSort('symbol')}>Symbol <BsArrowDownUp className="ms-1" /></th>
              {isGlobal && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isGlobal ? 4 : 3}>Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={isGlobal ? 4 : 3} className="text-center">No data</td></tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.unitID}>
                  <td>{r.unitName}</td>
                  <td>{r.symbol}</td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || r.companyProfileId || '-'}</td>}
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(r)} style={{ backgroundColor: '#4CAF50', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)', color: '#fff', borderRadius: '50px' }}>Edit</button>
                      <button type="button" className="btn btn-sm" onClick={() => confirmDelete(r)} style={{ backgroundColor: '#e02e2a', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)', color: '#fff', borderRadius: '50px' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</small>
        <div className="btn-group btn-group-sm">
          <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">{editing ? 'Edit Unit' : 'New Unit'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label>Unit Name</Form.Label>
              <Form.Control {...register('unitName')} isInvalid={!!errors.unitName} />
              <Form.Control.Feedback type="invalid">{errors.unitName?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Symbol</Form.Label>
              <Form.Control {...register('symbol')} />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} {...register('description')} />
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label className="mb-1">Company</Form.Label>
                <Form.Select {...register('companyProfileId')} isInvalid={!!errors.companyProfileId}>
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>{c.companyName} ({c.companyID})</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.companyProfileId?.message}</Form.Control.Feedback>
              </Form.Group>
            )}

            {/* Is Default Switch */}
            <Form.Group className="mb-2">
              <Form.Check
                type="switch"
                label="Is Default"
                {...register('isDefault')}
                className="mt-2"
              />
            </Form.Group>

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button type="submit" variant="success">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
}
