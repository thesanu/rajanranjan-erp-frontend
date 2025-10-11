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
import { BsPlus, BsUpload, BsDownload, BsFileEarmarkArrowDown, BsSearch, BsFilter, BsArrowDownUp } from 'react-icons/bs';
import api from '../services/api';

const PAGE_SIZE = 10;

export default function TaxRates() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [rates, setRates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('taxName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');
  const [importCompanySelect, setImportCompanySelect] = useState(isGlobal ? '' : null);

  const fileInputRef = useRef(null);

  const schema = yup.object({
    taxName: yup.string().trim().required('Tax name is required'),
    rate: yup
      .number()
      .typeError('Rate must be a number')
      .required('Rate is required')
      .min(0, 'Rate cannot be negative'),
    isActive: yup.boolean().default(true),
    ...(isGlobal && {
      companyProfileId: yup
        .number()
        .typeError('Company is required')
        .required('Company is required'),
    }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      taxName: '',
      rate: '',
      isActive: true,
      ...(isGlobal ? { companyProfileId: '' } : {}),
    }
  });

  useEffect(() => {
    const loadCompanies = async () => {
      if (!isGlobal) return;
      try {
        const res = await api.get('/CompanyProfile');
        setCompanies(res.data || []);
      } catch (e) {
        console.error("Failed to load companies", e);
      }
    };
    loadCompanies();
  }, [isGlobal]);

const fetchRates = async () => {
  try {
    setLoading(true);
    setError('');
    let url = '/TaxRates';
    const params = new URLSearchParams();

    // Admin sees own company
    if (isAdmin && user?.companyId) {
      params.append('companyProfileId', user.companyId);
    }

    // GlobalAdmin filter
    if (isGlobal && companyFilter !== '') {
      const compId = Number(companyFilter);
      if (!isNaN(compId)) params.append('companyProfileId', compId);
    }

    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await api.get(url);
    setRates(res.data || []);
  } catch (err) {
    console.error(err);
    setError(err?.response?.data?.message || 'Failed to load tax rates');
  } finally {
    setLoading(false);
  }
};
  useEffect(() => { fetchRates(); }, [companyFilter]);

  const openCreate = () => {
    setEditing(null);
    reset({
      taxName: '',
      rate: '',
      isActive: true,
      ...(isGlobal ? { companyProfileId: '' } : {}),
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({
      taxName: row.taxName || '',
      rate: row.rate || '',
      isActive: !!row.isActive,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {}),
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      taxName: data.taxName.trim(),
      rate: parseFloat(data.rate),
      isActive: !!data.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(data.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { taxRateID: editing.taxRateID } : {}),
    };

    try {
      if (editing) {
        await api.put(`/TaxRates/${editing.taxRateID}`, payload);
        toast.success('Tax rate updated');
      } else {
        await api.post('/TaxRates', payload);
        toast.success('Tax rate created');
      }
      setShow(false);
      fetchRates();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Save failed');
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this tax rate?',
      text: row.taxName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/TaxRates/${row.taxRateID}`);
      toast.success('Deleted successfully');
      fetchRates();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...rates];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.taxName || '').toLowerCase().includes(q) ||
        String(r.rate || '').toLowerCase().includes(q)
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
  }, [rates, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TaxRates');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'tax_rates.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'tax_rates.csv');
  };

  const downloadSample = () => {
    const sample = isGlobal
      ? [
          { taxName: 'GST', rate: 18, isActive: true, companyProfileId: '' },
          { taxName: 'VAT', rate: 12.5, isActive: false, companyProfileId: '' }
        ]
      : [
          { taxName: 'GST', rate: 18, isActive: true },
          { taxName: 'VAT', rate: 12.5, isActive: false }
        ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'tax_rate_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.taxName || r.rate === undefined || r.rate === null) continue;
        try {
          const payload = {
            taxName: String(r.taxName).trim(),
            rate: parseFloat(r.rate),
            isActive: String(r.isActive).toLowerCase() === 'true',
            ...(isGlobal
              // priority: from file if present, else use selected importCompanySelect
              ? { companyProfileId:
                    r.companyProfileId !== undefined
                      ? Number(r.companyProfileId)
                      : (importCompanySelect ? Number(importCompanySelect) : undefined)
                }
              : isAdmin && user?.companyId
                ? { companyProfileId: user.companyId }
                : {}
            )
          };
          // if companyProfileId is required (global) but isn't provided, skip this row
          if (isGlobal && (payload.companyProfileId === undefined || isNaN(payload.companyProfileId))) {
            // skip
            continue;
          }
          await api.post('/TaxRates', payload);
        } catch {
          // skip bad rows
        }
      }
      toast.success('Import completed');
      fetchRates();
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => processRows(res.data) });
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
        <h5 className="mb-0" style={{ color: 'rgba(17, 82, 73, 0.95)' }}>Tax Rates</h5>
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
            <>
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
            </>
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

          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={exportCSV}
              title="Export CSV"
              style={{
                backgroundColor: '#0dcaf0',
                borderColor: '#31d2f2',
                borderRadius: '50px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem 0.75rem',
                color: '#fff',
              }}
            >
              <BsDownload className="me-1" /> CSV
            </Button>

            <Button
              size="sm"
              onClick={exportExcel}
              title="Export Excel"
              style={{
                backgroundColor: '#198754',
                borderColor: '#146c43',
                borderRadius: '50px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem 0.75rem',
                color: '#fff',
              }}
            >
              <BsDownload className="me-1" /> Excel
            </Button>

            <Button
              size="sm"
              onClick={downloadSample}
              title="Download Sample"
              style={{
                backgroundColor: '#d4a017',
                borderColor: '#b3880e',
                borderRadius: '50px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem 0.75rem',
                color: '#fff',
              }}
            >
              <BsFileEarmarkArrowDown className="me-1" /> Sample
            </Button>

            <Form.Group controlId="import" className="mb-0">
              <Form.Label
                className="btn btn-sm d-inline-flex align-items-center gap-2 mb-0"
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#0d6efd',
                  borderColor: '#0a58ca',
                  borderRadius: '50px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                  padding: '0.25rem 0.75rem',
                  color: '#fff',
                }}
              >
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
              <th role="button" onClick={() => toggleSort('taxName')}>
                Name <BsArrowDownUp className="ms-1" />
              </th>
              <th role="button" onClick={() => toggleSort('rate')}>
                Rate <BsArrowDownUp className="ms-1" />
              </th>
              <th>Active</th>
              {isGlobal && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isGlobal ? 5 : 4}>Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={isGlobal ? 5 : 4} className="text-center">No data</td></tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.taxRateID}>
                  <td>{r.taxName}</td>
                  <td>{r.rate}</td>
                  <td>{r.isActive ? 'Yes' : 'No'}</td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || '-'}</td>}
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openEdit(r)}
                        title="Edit"
                        style={{
                          backgroundColor: '#4CAF50',
                          color: '#fff',
                          borderRadius: '50px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                          padding: '0.25rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => confirmDelete(r)}
                        title="Delete"
                        style={{
                          backgroundColor: '#e02e2a',
                          color: '#fff',
                          borderRadius: '50px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
                          padding: '0.25rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
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
    <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
      Prev
    </Button>
    <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
      Next
    </Button>
  </div>
</div>


      {/* Modal */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">{editing ? 'Edit Tax Rate' : 'New Tax Rate'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Tax Name</Form.Label>
              <Form.Control {...register('taxName')} isInvalid={!!errors.taxName} />
              <Form.Control.Feedback type="invalid">{errors.taxName?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="mb-1">Rate (%)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                {...register('rate')}
                isInvalid={!!errors.rate}
              />
              <Form.Control.Feedback type="invalid">{errors.rate?.message}</Form.Control.Feedback>
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label className="mb-1">Company</Form.Label>
                <Form.Select {...register('companyProfileId')} isInvalid={!!errors.companyProfileId}>
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>
                      {c.companyName} ({c.companyID})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.companyProfileId?.message}</Form.Control.Feedback>
              </Form.Group>
            )}

            <Form.Check
              type="switch"
              label="Is Active"
              className="mt-2"
              {...register('isActive')}
            />
          </Modal.Body>

          <Modal.Footer className="py-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShow(false)}
              style={{
                borderRadius: '50px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                padding: '0.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              size="sm"
              disabled={isSubmitting}
              style={{
                borderRadius: '50px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                padding: '0.25rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSubmitting ? (editing ? 'Updating...' : 'Saving...') : (editing ? 'Update' : 'Create')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}