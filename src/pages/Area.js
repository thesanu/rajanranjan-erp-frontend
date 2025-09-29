import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Table, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BsPlus, BsPencil, BsTrash, BsUpload, BsDownload, BsFileEarmarkArrowDown, BsSearch, BsFilter, BsArrowDownUp } from 'react-icons/bs';
import api from '../services/api';

const PAGE_SIZE = 10;

export default function AreaMaster() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [areas, setAreas] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('areaName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  const schema = yup.object({
    areaName: yup.string().trim().required('Area name is required'),
    description: yup.string().nullable(),
    isActive: yup.boolean().default(true),
    ...(isGlobal && {
      companyProfileId: yup
        .number()
        .typeError('Company ID must be a number')
        .required('Company ID is required'),
    }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      areaName: '',
      description: '',
      isActive: true,
      companyProfileId: isGlobal ? '' : undefined,
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

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Areas';  
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
      setAreas(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchAreas(); }, [companyFilter]);

  const openCreate = () => {
    setEditing(null);
    reset({ areaName: '', description: '', isActive: true, companyProfileId: isGlobal ? '' : undefined });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({
      areaName: row.areaName || '',
      description: row.description || '',
      isActive: !!row.isActive,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {})
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      areaName: data.areaName.trim(),
      description: data.description?.trim() || '',
      isActive: !!data.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(data.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { areaID: editing.areaID } : {})
    };

    try {
      if (editing) {
        await api.put(`/Areas/${editing.areaID}`, payload);  // ✅ correct endpoint
        toast.success('Area updated');
      } else {
        await api.post('/Areas', payload);  // ✅ correct endpoint
        toast.success('Area created');
      }
      setShow(false);
      fetchAreas();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Save failed');
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this area?',
      text: row.areaName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/Area/${row.areaID}`);
      toast.success('Area deleted successfully');
      fetchAreas();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...areas];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.areaName || '').toLowerCase().includes(q) ||
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
  }, [areas, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Areas');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'areas.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'areas.csv');
  };

  const downloadSample = () => {
    const sample = [
      { areaName: 'North Zone', description: 'Sample area', isActive: true }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'area_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.areaName) continue;
        try {
          await api.post('/Area', {
            areaName: String(r.areaName).trim(),
            description: String(r.description || '').trim(),
            isActive: String(r.isActive).toLowerCase() === 'true',
            ...(isAdmin && user?.companyId ? { companyProfileId: user.companyId } : {})
          });
        } catch { }
      }
      toast.success('Import completed');
      fetchAreas();
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
      <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
        <h5 className="mb-0">Areas</h5>
        <Button size="sm" onClick={openCreate} style={{ backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)' }}>
          <BsPlus className="me-1" /> Add
        </Button>
      </div>

      <div className="border p-2 bg-light mb-2">
        <div className="row gx-2 gy-2 align-items-center">
          {user?.role === 'GlobalAdmin' && (
            <div className="col-auto">
              <InputGroup size="sm">
                <InputGroup.Text><BsFilter /></InputGroup.Text>
                <Form.Select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}>
                  <option value="">All Companies</option>
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
              <th role="button" onClick={() => toggleSort('areaName')}>Name <BsArrowDownUp className="ms-1" /></th>
              <th>Description</th>
              <th>Active</th>
              {user?.role === 'GlobalAdmin' && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={user?.role === 'GlobalAdmin' ? 5 : 4}>Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={user?.role === 'GlobalAdmin' ? 5 : 4} className="text-center">No data</td></tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.areaID}>
                  <td>{r.areaName}</td>
                  <td>{r.description}</td>
                  <td>{r.isActive ? 'Yes' : 'No'}</td>
                  {user?.role === 'GlobalAdmin' && <td>{companyMap[r.companyProfileId] || '-'}</td>}
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
            <Modal.Title className="fs-6">{editing ? 'Edit Area' : 'New Area'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label>Name</Form.Label>
              <Form.Control {...register('areaName')} isInvalid={!!errors.areaName} />
              <Form.Control.Feedback type="invalid">{errors.areaName?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} {...register('description')} />
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


            <Form.Check type="switch" label="Is Default" {...register('isDefault')} className="mt-2" />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button type="submit" variant="success">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}