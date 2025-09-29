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

export default function ProductMaster() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';

  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [mills, setMills] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('productName');
  const [sortDir, setSortDir] = useState('asc');
  const [companyFilter, setCompanyFilter] = useState('');

  const fileInputRef = useRef(null);

  // Validation schema
  const schema = yup.object({
    productName: yup.string().trim().required('Product name is required'),
    groupID: yup.number().typeError('Select product group').required('Product group is required'),
    unitID: yup.number().typeError('Select unit').required('Unit is required'),
    rate: yup.number().nullable(),
    openingStock: yup.number().nullable(),
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
      productName: '',
      groupID: '',
      unitID: '',
      designID: '',
      sizeID: '',
      millID: '',
      rate: '',
      openingStock: '',
      description: '',
      isActive: true,
      companyProfileId: isGlobal ? '' : undefined,
    }
  });

  // Load static dropdowns & companies
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [pg, un, de, si, mi] = await Promise.all([
          api.get('/ProductGroup'),
          api.get('/Unit'),
          api.get('/Design'),
          api.get('/ProductSize'),
          api.get('/Mill'),
        ]);
        setGroups(pg.data || []);
        setUnits(un.data || []);
        setDesigns(de.data || []);
        setSizes(si.data || []);
        setMills(mi.data || []);
      } catch (e) {
        console.error('Failed to load lookups', e);
      }
    };
    loadLookups();

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

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      let url = '/Product';
      const params = new URLSearchParams();

      if (isAdmin && user?.companyId) {
        params.append('companyProfileId', user.companyId);
      }
      if (isGlobal && companyFilter && !isNaN(companyFilter)) {
        params.append('companyProfileId', companyFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      setProducts(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load products');
      toast.error(err?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [companyFilter]);

  // Open forms
  const openCreate = () => {
    setEditing(null);
    reset({
      productName: '',
      groupID: '',
      unitID: '',
      designID: '',
      sizeID: '',
      millID: '',
      rate: '',
      openingStock: '',
      description: '',
      isActive: true,
      companyProfileId: isGlobal ? '' : undefined,
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({
      productName: row.productName || '',
      groupID: row.groupID || '',
      unitID: row.unitID || '',
      designID: row.designID || '',
      sizeID: row.sizeID || '',
      millID: row.millID || '',
      rate: row.rate ?? '',
      openingStock: row.openingStock ?? '',
      description: row.description || '',
      isActive: row.isActive ?? true,
      ...(isGlobal ? { companyProfileId: row.companyProfileId || '' } : {}),
    });
    setShow(true);
  };

  // Submit form
  const onSubmit = async (data) => {
    const payload = {
      productName: data.productName.trim(),
      groupID: Number(data.groupID),
      unitID: Number(data.unitID),
      designID: data.designID ? Number(data.designID) : null,
      sizeID: data.sizeID ? Number(data.sizeID) : null,
      millID: data.millID ? Number(data.millID) : null,
      rate: data.rate ? Number(data.rate) : null,
      openingStock: data.openingStock ? Number(data.openingStock) : null,
      description: data.description?.trim() || '',
      isActive: !!data.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(data.companyProfileId) }
        : isAdmin && user?.companyId
          ? { companyProfileId: Number(user.companyId) }
          : {}),
      ...(editing ? { productID: editing.productID } : {}),
    };

    try {
      if (editing) {
        await api.put(`/Product/${editing.productID}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/Product', payload);
        toast.success('Product created');
      }
      setShow(false);
      fetchProducts();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast.error('Not authorized.');
      else if (status === 500) toast.error('Server error.');
      else toast.error(err?.response?.data?.message || 'Save failed');
    }
  };

  // Delete confirm
  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: 'Delete this product?',
      text: row.productName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/Product/${row.productID}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  // Sorting + filtering
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let rows = [...products];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.productName || '').toLowerCase().includes(q) ||
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
  }, [products, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export + Import
  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'products.csv');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'products.xlsx');
  };

  const downloadSample = () => {
    const sample = [{
      productName: 'Sample Shirt',
      groupID: '',
      unitID: '',
      designID: '',
      sizeID: '',
      millID: '',
      rate: 100,
      openingStock: 50,
      description: 'Blue Cotton Shirt',
      isActive: true,
      ...(isGlobal ? { companyProfileId: '' } : {})
    }];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'product_sample.csv');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.productName) continue;
        try {
          await api.post('/Product', {
            productName: String(r.productName).trim(),
            groupID: Number(r.groupID),
            unitID: Number(r.unitID),
            designID: r.designID ? Number(r.designID) : null,
            sizeID: r.sizeID ? Number(r.sizeID) : null,
            millID: r.millID ? Number(r.millID) : null,
            rate: r.rate ? Number(r.rate) : null,
            openingStock: r.openingStock ? Number(r.openingStock) : null,
            description: String(r.description || '').trim(),
            isActive: r.isActive === 'false' ? false : true,
            ...(isGlobal && r.companyProfileId ? { companyProfileId: Number(r.companyProfileId) } : {}),
            ...(isAdmin && user?.companyId ? { companyProfileId: Number(user.companyId) } : {}),
          });
        } catch {
          // skip row errors
        }
      }
      toast.success('Import completed');
      fetchProducts();
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

  // Lookup helpers
  const getName = (id, list, key, nameKey) => {
    const item = list.find(i => i[key] === id);
    return item ? item[nameKey] : '';
  };

  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach(c => { map[c.companyID] = c.companyName; });
    return map;
  }, [companies]);
const unitMap = useMemo(() => {
  const map = {};
  units.forEach(u => { map[u.unitID] = u.unitName; });
  return map;
}, [units]);

const designMap = useMemo(() => {
  const map = {};
  designs.forEach(d => { map[d.designID] = d.designName; });
  return map;
}, [designs]);

const sizeMap = useMemo(() => {
  const map = {};
  sizes.forEach(s => { map[s.sizeID] = s.sizeName; });
  return map;
}, [sizes]);

const millMap = useMemo(() => {
  const map = {};
  mills.forEach(m => { map[m.millID] = m.millName; });
  return map;
}, [mills]);

  return (
  <div className="container-fluid">
    <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
      <h5 className="mb-0">Products</h5>
      <Button
        size="sm"
        onClick={openCreate}
        style={{ backgroundColor: '#0d6efd', borderColor: '#0a58ca', borderRadius: '50px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)' }}
      >
        <BsPlus className="me-1" /> Add
      </Button>
    </div>

    {/* Toolbar */}
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

    {/* Table */}
    <div className="table-responsive border bg-white">
      <Table hover size="sm" className="mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th role="button" onClick={() => toggleSort('productName')}>Product <BsArrowDownUp className="ms-1" /></th>
            <th>Group</th>
            <th>Unit</th>
            <th>Design</th>
            <th>Size</th>
            <th>Mill</th>
            <th className="text-end">Rate</th>
            <th className="text-end">Opening</th>
            {isGlobal && <th>Company</th>}
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={isGlobal ? 10 : 9}>Loading...</td></tr>
          ) : pageRows.length === 0 ? (
            <tr><td colSpan={isGlobal ? 10 : 9} className="text-center">No data</td></tr>
          ) : (
            pageRows.map(r => (
              <tr key={r.productID}>
                <td>{r.productName}</td>
               <td>{r.groupName || '-'}</td>
               <td>{unitMap[r.unitID] || '-'}</td>
                <td>{designMap[r.designID] || '-'}</td>
                <td>{sizeMap[r.sizeID] || '-'}</td>
                <td>{millMap[r.millID] || '-'}</td>
                <td className="text-end">{r.rate ?? '-'}</td>
                <td className="text-end">{r.openingStock ?? '-'}</td>
                {isGlobal && <td>{companyMap[r.companyProfileId] || '-'}</td>}
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
    <Modal show={show} onHide={() => setShow(false)} centered size="lg">
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">{editing ? 'Edit Product' : 'New Product'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger py-1">{error}</div>}

          <div className="row g-2">
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Product Name</Form.Label>
                <Form.Control {...register('productName')} isInvalid={!!errors.productName} />
                <Form.Control.Feedback type="invalid">{errors.productName?.message}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Group</Form.Label>
                <Form.Select {...register('groupID')} isInvalid={!!errors.groupID}>
                  <option value="">-- Select --</option>
                  {groups.map(g => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.groupID?.message}</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Unit</Form.Label>
                <Form.Select {...register('unitID')} isInvalid={!!errors.unitID}>
                  <option value="">-- Select --</option>
                  {units.map(u => <option key={u.unitID} value={u.unitID}>{u.unitName}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.unitID?.message}</Form.Control.Feedback>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Design</Form.Label>
                <Form.Select {...register('designID')}>
                  <option value="">-- Select --</option>
                  {designs.map(d => <option key={d.designID} value={d.designID}>{d.designName}</option>)}
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Size</Form.Label>
                <Form.Select {...register('sizeID')}>
                  <option value="">-- Select --</option>
                  {sizes.map(s => <option key={s.sizeID} value={s.sizeID}>{s.sizeName}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Mill</Form.Label>
                <Form.Select {...register('millID')}>
                  <option value="">-- Select --</option>
                  {mills.map(m => <option key={m.millID} value={m.millID}>{m.millName}</option>)}
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Rate</Form.Label>
                <Form.Control type="number" step="0.01" {...register('rate')} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-2">
                <Form.Label>Opening Stock</Form.Label>
                <Form.Control type="number" step="0.01" {...register('openingStock')} />
              </Form.Group>
            </div>

            <div className="col-12">
              <Form.Group className="mb-2">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={2} {...register('description')} />
              </Form.Group>
            </div>

            {isGlobal && (
              <div className="col-12">
                <Form.Group className="mb-2">
                  <Form.Label>Company</Form.Label>
                  <Form.Select {...register('companyProfileId')} isInvalid={!!errors.companyProfileId}>
                    <option value="">-- Select Company --</option>
                    {companies.map(c => (
                      <option key={c.companyID} value={c.companyID}>{c.companyName} ({c.companyID})</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.companyProfileId?.message}</Form.Control.Feedback>
                </Form.Group>
              </div>
            )}

            <div className="col-12">
              <Form.Check type="checkbox" label="Active" {...register('isActive')} defaultChecked />
            </div>
          </div>
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