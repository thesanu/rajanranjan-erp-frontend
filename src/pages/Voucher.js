// VoucherMaster.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal, Button, Form, Table, InputGroup, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { BsPlus, BsDownload, BsUpload, BsFileEarmarkArrowDown, BsSearch, BsFilter, BsArrowDownUp } from 'react-icons/bs';
import api from '../services/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BeatLoader } from 'react-spinners';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 10;

export default function VoucherMaster() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [vouchers, setVouchers] = useState([]);
  const [voucherTypes, setVoucherTypes] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('voucherNo');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  // Validation schema
  const schema = yup.object({
    voucherTypeID: yup.number().required('Voucher Type is required'),
    voucherDate: yup.date().required('Voucher Date is required'),
    narration: yup.string().nullable(),
    companyProfileId: isGlobal ? yup.number().required('Company is required') : yup.number().nullable(),
    items: yup.array().of(
      yup.object({
        ledgerID: yup.number().nullable(),
        productID: yup.number().nullable(),
        taxRateID: yup.number().nullable(),
        amount: yup.number().typeError('Amount must be a number').required('Amount required'),
        description: yup.string().nullable()
      })
    ).min(1, 'Add at least one item')
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      voucherTypeID: '',
      voucherDate: new Date().toISOString().slice(0,10),
      narration: '',
      companyProfileId: isGlobal ? '' : undefined,
      items: [{ ledgerID: '', productID: '', taxRateID: '', amount: 0, description: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Load dropdown data and vouchers
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [vt, ld, pr, tx, cp] = await Promise.all([
          api.get('/VoucherTypes'),
          api.get('/Ledgers'),
          api.get('/Products'),
          api.get('/TaxRates'),
          isGlobal ? api.get('/CompanyProfile') : Promise.resolve({ data: [] })
        ]);
        setVoucherTypes(vt.data || []);
        setLedgers(ld.data || []);
        setProducts(pr.data || []);
        setTaxRates(tx.data || []);
        setCompanies(cp.data || []);
      } catch (err) {
        console.error('Lookup load failed', err);
      }
    };
    loadLookups();
  }, [isGlobal]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Voucher';
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
      setVouchers(res.data || []);
    } catch (err) {
      console.error('Failed to load vouchers', err);
      setError('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [companyFilter]);

  // Helpers
  const calculateItemTotal = (item) => {
    const amt = Number(item.amount || 0);
    // If taxRate provided, calculate tax if taxRates has a percent
    const tr = taxRates.find(t => String(t.taxRateID) === String(item.taxRateID));
    const taxPercent = tr ? Number(tr.rate || 0) : 0;
    const taxAmount = (amt * taxPercent) / 100;
    return amt + taxAmount;
  };

  const calculateVoucherAmount = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((s, it) => s + calculateItemTotal(it), 0);
  };

  // Open Create
  const openCreate = () => {
    setEditing(null);
    reset({
      voucherTypeID: '',
      voucherDate: new Date().toISOString().slice(0,10),
      narration: '',
      companyProfileId: isGlobal ? '' : undefined,
      items: [{ ledgerID: '', productID: '', taxRateID: '', amount: 0, description: '' }]
    });
    setShow(true);
  };

  // Open Edit
  const openEdit = async (row) => {
    try {
      const res = await api.get(`/Voucher/${row.voucherID}`);
      const v = res.data;
      // transform items to match form field ids (if necessary)
      reset({
        voucherTypeID: v.voucherTypeID || '',
        voucherDate: v.voucherDate ? new Date(v.voucherDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
        narration: v.narration || '',
        companyProfileId: v.companyProfileId || (isGlobal ? '' : undefined),
        items: (v.voucherItems || []).map(i => ({
          ledgerID: i.ledgerID ?? '',
          productID: i.productID ?? '',
          taxRateID: i.taxRateID ?? '',
          amount: i.amount ?? 0,
          description: i.description ?? ''
        }))
      });
      setEditing(v);
      setShow(true);
    } catch (err) {
      console.error('Failed to fetch voucher', err);
      toast.error('Could not fetch voucher details.');
    }
  };

  // Save (create or update)
  const onSubmit = async (data) => {
    const payload = {
      voucherTypeID: Number(data.voucherTypeID),
      voucherDate: data.voucherDate,
      narration: data.narration || '',
      voucherItems: data.items.map(it => ({
        ledgerID: it.ledgerID ? Number(it.ledgerID) : null,
        productID: it.productID ? Number(it.productID) : null,
        taxRateID: it.taxRateID ? Number(it.taxRateID) : null,
        amount: Number(it.amount || 0),
        description: it.description || ''
      })),
      ...(isGlobal
        ? { companyProfileId: Number(data.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {})
    };

    try {
      if (editing) {
        await api.put(`/Voucher/${editing.voucherID}`, { ...payload, voucherID: editing.voucherID });
        toast.success('Voucher updated');
      } else {
        await api.post('/Voucher', payload);
        toast.success('Voucher created');
      }
      setShow(false);
      fetchVouchers();
    } catch (err) {
      console.error('Save failed', err);
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data || 'Save failed');
    }
  };

  // Delete
  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this voucher?',
      text: `${row.voucherNo} — ${row.narration || ''}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/Voucher/${row.voucherID}`);
      toast.success('Voucher deleted');
      fetchVouchers();
    } catch (err) {
      console.error('Delete failed', err);
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data || 'Delete failed');
    }
  };

  // Filtering and sorting
  const filtered = useMemo(() => {
    let rows = [...vouchers];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.voucherNo || '').toLowerCase().includes(q) ||
        (r.voucherType?.voucherName || '').toLowerCase().includes(q) ||
        (r.narration || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = ((a[sortKey] ?? '') + '').toString().toLowerCase();
      const vb = ((b[sortKey] ?? '') + '').toString().toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [vouchers, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Export & Import
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'vouchers.xlsx');
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'vouchers.csv');
  };

  const downloadSample = () => {
    const sample = [
      {
        voucherTypeID: '',
        voucherDate: new Date().toISOString().slice(0,10),
        narration: 'Sample voucher',
        companyProfileId: isGlobal ? '' : undefined,
        items: JSON.stringify([{ ledgerID: '', productID: '', taxRateID: '', amount: 100, description: 'Sample item' }])
      }
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'voucher_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      // Rows should have columns voucherTypeID, voucherDate, narration, companyProfileId, items (JSON string or multiple rows)
      for (const r of rows) {
        try {
          const items = r.items ? (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) : [];
          const payload = {
            voucherTypeID: Number(r.voucherTypeID),
            voucherDate: r.voucherDate,
            narration: r.narration || '',
            voucherItems: (Array.isArray(items) ? items : []).map(it => ({
              ledgerID: it.ledgerID ? Number(it.ledgerID) : null,
              productID: it.productID ? Number(it.productID) : null,
              taxRateID: it.taxRateID ? Number(it.taxRateID) : null,
              amount: Number(it.amount || 0),
              description: it.description || ''
            })),
            ...(isAdmin && user?.companyId ? { companyProfileId: user.companyId } : {})
          };
          await api.post('/Voucher', payload);
        } catch (err) {
          // ignore row errors but log
          console.warn('Import row failed', err);
        }
      }
      toast.success('Import completed');
      fetchVouchers();
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

  // Company map for display
  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      if (c.companyID != null && c.companyName) {
        map[c.companyID] = c.companyName;
      }
    });
    return map;
  }, [companies]);

  // Watch items to compute totals live
  const watchedItems = watch('items');

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
        <h5 className="mb-0" style={{ color: 'rgba(17, 82, 73, 0.95)' }}>Vouchers</h5>
        <Button size="sm" onClick={openCreate} style={{ backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px' }}>
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
              <Form.Control placeholder="Search by voucher no, type, narration..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </InputGroup>
          </div>

          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button size="sm" onClick={exportCSV} style={{ backgroundColor: '#0dcaf0', borderColor: '#31d2f2', borderRadius: '50px', color: '#fff' }}>
              <BsDownload className="me-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportExcel} style={{ backgroundColor: '#198754', borderColor: '#146c43', borderRadius: '50px', color: '#fff' }}>
              <BsDownload className="me-1" /> Excel
            </Button>
            <Button size="sm" onClick={downloadSample} style={{ backgroundColor: '#d4a017', borderColor: '#b3880e', borderRadius: '50px', color: '#fff' }}>
              <BsFileEarmarkArrowDown className="me-1" /> Sample
            </Button>
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
              <th role="button" onClick={() => toggleSort('voucherNo')}>Voucher No <BsArrowDownUp className="ms-1" /></th>
              <th role="button" onClick={() => toggleSort('voucherDate')}>Date <BsArrowDownUp className="ms-1" /></th>
              <th role="button" onClick={() => toggleSort('voucherType')}>Type <BsArrowDownUp className="ms-1" /></th>
              <th>Narration</th>
              <th>Amount</th>
              {isGlobal && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isGlobal ? 7 : 6} className="text-center py-4">
                  <BeatLoader size={10} margin={4} color="#177366" loading={true} speedMultiplier={1.5} />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={isGlobal ? 7 : 6} className="text-center">No data</td>
              </tr>
            ) : (
              pageRows.map(v => (
                <tr key={v.voucherID}>
                  <td>{v.voucherNo}</td>
                  <td>{new Date(v.voucherDate).toLocaleDateString()}</td>
                  <td>{v.voucherType?.voucherName}</td>
                  <td>{v.narration}</td>
                  <td>{calculateVoucherAmount(v.voucherItems || []).toFixed(2)}</td>
                  {isGlobal && <td>{companyMap[v.companyProfileId] || '-'}</td>}
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openEdit(v)}
                        style={{ backgroundColor: '#2d642fff', boxShadow: '0 4px 6px rgba(0,0,0,0.25)', color: '#fff', borderRadius: '50px' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => confirmDelete(v)}
                        style={{ backgroundColor: '#e02e2a', boxShadow: '0 4px 6px rgba(0,0,0,0.25)', color: '#fff', borderRadius: '50px' }}
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

      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</small>
        <div className="btn-group btn-group-sm">
          <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Modal Form */}
      <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton className="custom-modal-header">
            <Modal.Title className="fs-6 modal-title-custom">
              {editing ? 'Edit Voucher' : 'New Voucher'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Row className="g-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Voucher Type</Form.Label>
                  <Form.Select {...register('voucherTypeID')} isInvalid={!!errors.voucherTypeID}>
                    <option value="">-- Select Type --</option>
                    {voucherTypes.map(vt => (
                      <option key={vt.voucherTypeID} value={vt.voucherTypeID}>{vt.voucherName}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.voucherTypeID?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" {...register('voucherDate')} isInvalid={!!errors.voucherDate} />
                  <Form.Control.Feedback type="invalid">{errors.voucherDate?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              {isGlobal && (
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Company</Form.Label>
                    <Form.Select {...register('companyProfileId')} isInvalid={!!errors.companyProfileId}>
                      <option value="">-- Select --</option>
                      {companies.map(c => <option key={c.companyID} value={c.companyID}>{c.companyName}</option>)}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.companyProfileId?.message}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              )}
            </Row>

            <Form.Group className="mt-2">
              <Form.Label>Narration</Form.Label>
              <Form.Control as="textarea" rows={2} {...register('narration')} />
            </Form.Group>

            {/* Items table */}
            <div className="mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Items</h6>
                <Button size="sm" onClick={() => append({ ledgerID: '', productID: '', taxRateID: '', amount: 0, description: '' })} style={{ borderRadius: '50px' }}>
                  <BsPlus className="me-1" /> Add Item
                </Button>
              </div>

              <div className="table-responsive">
                <Table size="sm" bordered>
                  <thead className="table-light">
                    <tr>
                      <th>Ledger</th>
                      <th>Product</th>
                      <th>Tax Rate (%)</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th style={{ width: 100 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => (
                      <tr key={field.id}>
                        <td>
                          <Form.Select {...register(`items.${idx}.ledgerID`)}>
                            <option value="">-- Ledger --</option>
                            {ledgers.map(l => <option key={l.ledgerID} value={l.ledgerID}>{l.ledgerName}</option>)}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Select {...register(`items.${idx}.productID`)}>
                            <option value="">-- Product --</option>
                            {products.map(p => <option key={p.productID} value={p.productID}>{p.productName}</option>)}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Select {...register(`items.${idx}.taxRateID`)}>
                            <option value="">0</option>
                            {taxRates.map(t => <option key={t.taxRateID} value={t.taxRateID}>{t.rate}</option>)}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Control type="number" step="0.01" {...register(`items.${idx}.amount`)} isInvalid={!!(errors.items && errors.items[idx]?.amount)} />
                          <Form.Control.Feedback type="invalid">{errors.items && errors.items[idx]?.amount?.message}</Form.Control.Feedback>
                        </td>
                        <td>
                          <Form.Control {...register(`items.${idx}.description`)} />
                        </td>
                        <td className="text-center">
                          <Button size="sm" variant="danger" onClick={() => remove(idx)} style={{ borderRadius: '50px' }}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="d-flex justify-content-end">
                <div className="pe-3">
                  <strong>Total:</strong> {calculateVoucherAmount(watchedItems || []).toFixed(2)}
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button type="submit" variant="success" disabled={isSubmitting}>{editing ? 'Update' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .modal-title-custom { color: #fff; }
        .custom-modal-header { background-color: rgba(23,115,102,0.95); color: #fff; }
        .custom-modal-header .btn-close { filter: brightness(0) invert(1); }
      `}</style>
    </div>
  );
}
