import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Form, Row, Col, Table, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { BsPlus, BsPencil, BsTrash, BsDownload, BsSearch, BsArrowDownUp } from 'react-icons/bs';
import api from '../services/api';

const schema = yup.object({
  companyName: yup.string().trim().required('Company name is required'),
  address: yup.string().trim().required('Address is required'),
  contactNumber: yup.string().trim().required('Contact number is required'),
  email: yup.string().trim().email('Invalid email format').required('Email is required'),
  gstin: yup.string().trim().required('GSTIN is required'),
  financialYearStart: yup.date().required('Financial year start is required'),
  financialYearEnd: yup.date().required('Financial year end is required'),
  isActive: yup.boolean().default(true)
});

const PAGE_SIZE = 10;

export default function CompanyProfile() {
  const { user } = useAuth();
  const isGlobal = user?.role === 'GlobalAdmin';
  const isAdmin = user?.role === 'Admin';
  const isUser = user?.role === 'User';

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('companyName');
  const [sortDir, setSortDir] = useState('asc');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { 
      companyName: '', 
      address: '', 
      contactNumber: '', 
      email: '', 
      gstin: '', 
      financialYearStart: '', 
      financialYearEnd: '', 
      isActive: true 
    }
  });

  // Don't render anything for User role
  if (isUser) {
    return (
      <div className="container-fluid py-3">
        <h4 className="mb-3">Company Profiles</h4>
        <div className="alert alert-danger">
          Access denied. Only Admin and GlobalAdmin can view company profiles.
        </div>
      </div>
    );
  }

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get('/CompanyProfile');
      let profiles = res.data || [];

      // Filter for Admin role (keep only their company)
      if (isAdmin && user?.companyProfileId) {
        profiles = profiles.filter(p => p.companyID === user.companyProfileId);
      }

      setProfiles(profiles);
    } catch (err) {
      console.error('Fetch profiles error:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Insufficient permissions.');
      } else {
        setError('Failed to load company profiles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchProfiles(); 
  }, []);

  const openCreate = () => {
    if (!isGlobal) {
      toast.error('Only Global Admin can add companies.');
      return;
    }
    setEditing(null);
    reset({ 
      companyName: '', 
      address: '', 
      contactNumber: '', 
      email: '', 
      gstin: '', 
      financialYearStart: '', 
      financialYearEnd: '', 
      isActive: true 
    });
    setShow(true);
  };

  const openEdit = (row) => {
    if (!isGlobal) {
      toast.error('Only Global Admin can edit companies.');
      return;
    }
    setEditing(row);
    reset({
      companyName: row.companyName || '',
      address: row.address || '',
      contactNumber: row.contactNumber || '',
      email: row.email || '',
      gstin: row.gstin || '',
      financialYearStart: row.financialYearStart?.split('T')[0] || '',
      financialYearEnd: row.financialYearEnd?.split('T')[0] || '',
      isActive: !!row.isActive
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    if (!isGlobal) {
      toast.error('Only Global Admin can save companies.');
      return;
    }

    const payload = {
      companyName: data.companyName.trim(),
      address: data.address.trim(),
      contactNumber: data.contactNumber.trim(),
      email: data.email.trim(),
      gstin: data.gstin.trim(),
      financialYearStart: data.financialYearStart,
      financialYearEnd: data.financialYearEnd,
      isActive: !!data.isActive,
      ...(editing ? { companyID: editing.companyID } : {})
    };

    try {
      if (editing) {
        await api.put(`/CompanyProfile/${editing.companyID}`, payload);
        toast.success('Company updated');
      } else {
        await api.post('/CompanyProfile', payload);
        toast.success('Company created');
      }
      setShow(false);
      fetchProfiles();
    } catch (err) {
      console.error('Save company profile error:', err.response || err);
      if (err.response?.status === 403) {
        toast.error('Access denied. Only Global Admin can save companies.');
      } else {
        toast.error(err?.response?.data?.message || 'Save failed');
      }
    }
  };

  const confirmDelete = async (row) => {
    if (!isGlobal) {
      toast.error('Only Global Admin can delete companies.');
      return;
    }

    const res = await Swal.fire({
      title: 'Delete this company?',
      text: row.companyName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (!res.isConfirmed) return;
    
    try {
      await api.delete(`/CompanyProfile/${row.companyID}`);
      toast.success('Deleted');
      fetchProfiles();
    } catch (err) {
      console.error('Delete error:', err.response || err);
      if (err.response?.status === 403) {
        toast.error('Access denied. Only Global Admin can delete companies.');
      } else {
        toast.error(err?.response?.data?.message || 'Delete failed');
      }
    }
  };

  const toggleActiveStatus = async (row) => {
    if (!isGlobal) {
      toast.error('Only Global Admin can update company status.');
      return;
    }

    try {
      await api.put(`/CompanyProfile/${row.companyID}`, {
        ...row,
        isActive: !row.isActive
      });
      toast.success(`Company ${!row.isActive ? 'activated' : 'deactivated'}`);
      fetchProfiles();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...profiles];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.companyName || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.contactNumber || '').toLowerCase().includes(q) ||
        (r.gstin || '').toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q)
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
  }, [profiles, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const exportExcel = () => {
    const exportData = filtered.map(profile => ({
      'Company Name': profile.companyName,
      'Address': profile.address,
      'Contact Number': profile.contactNumber,
      'Email': profile.email,
      'GSTIN': profile.gstin,
      'Financial Year Start': profile.financialYearStart?.split('T')[0],
      'Financial Year End': profile.financialYearEnd?.split('T')[0],
      'Status': profile.isActive ? 'Active' : 'Inactive'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CompanyProfiles');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'company_profiles.xlsx');
  };

  return (
    <div className="container-fluid py-3">

      {/* Header and Action Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Company Profiles</h4>
        {isGlobal && (
          <Button variant="primary" size="sm" onClick={openCreate}>
            <BsPlus className="me-1" /> Add Company
          </Button>
        )}
      </div>

      {/* Filter & Action Controls */}
      <div className="bg-light p-3 rounded shadow-sm mb-4">
        <div className="row gy-2 gx-3 align-items-center">

          {/* Search Input */}
          <div className="col-md-auto">
            <InputGroup>
              <InputGroup.Text><BsSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Search by name, email, contact, GSTIN..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </InputGroup>
          </div>

          {/* Export Excel Button */}
          <div className="col-md-auto">
            <Button variant="success" size="sm" onClick={exportExcel} title="Export to Excel">
              <BsDownload className="me-1" /> Export Excel
            </Button>
          </div>

        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      {/* Data Table */}
      <div className="table-responsive shadow-sm rounded bg-white">
        <Table hover className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: '20%' }} role="button" onClick={() => toggleSort('companyName')}>
                Company Name <BsArrowDownUp className="ms-1" />
              </th>
              <th style={{ width: '20%' }}>Address</th>
              <th style={{ width: '12%' }} role="button" onClick={() => toggleSort('contactNumber')}>
                Contact <BsArrowDownUp className="ms-1" />
              </th>
              <th style={{ width: '15%' }} role="button" onClick={() => toggleSort('email')}>
                Email <BsArrowDownUp className="ms-1" />
              </th>
              <th style={{ width: '10%' }}>GSTIN</th>
              <th style={{ width: '8%' }}>FY Start</th>
              <th style={{ width: '8%' }}>FY End</th>
              <th style={{ width: '7%' }}>Status</th>
              <th style={{ width: '10%' }} className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-4">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-4">No companies found</td></tr>
            ) : (
              pageRows.map(profile => (
                <tr key={profile.companyID}>
                  <td className="fw-medium">{profile.companyName}</td>
                  <td><small>{profile.address}</small></td>
                  <td>{profile.contactNumber}</td>
                  <td><small>{profile.email}</small></td>
                  <td><small>{profile.gstin}</small></td>
                  <td><small>{profile.financialYearStart?.split('T')[0]}</small></td>
                  <td><small>{profile.financialYearEnd?.split('T')[0]}</small></td>
                  <td>
                    {isGlobal ? (
                      <Form.Check
                        type="switch"
                        checked={profile.isActive}
                        onChange={() => toggleActiveStatus(profile)}
                        size="sm"
                      />
                    ) : (
                      <span className={`badge ${profile.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="text-end">
                    {isGlobal ? (
                      <div className="btn-group btn-group-sm">
                        <Button variant="outline-secondary" onClick={() => openEdit(profile)}>
                          <BsPencil />
                        </Button>
                        <Button variant="outline-danger" onClick={() => confirmDelete(profile)}>
                          <BsTrash />
                        </Button>
                      </div>
                    ) : isAdmin ? (
                      <small className="text-muted">View Only</small>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </small>
        <div className="btn-group">
          <Button variant="outline-secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline-secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Edit Company' : 'New Company'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Company Name</Form.Label>
                <Form.Control 
                  {...register('companyName')} 
                  isInvalid={!!errors.companyName} 
                  placeholder="e.g. ABC Pvt Ltd" 
                />
                <Form.Control.Feedback type="invalid">{errors.companyName?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  {...register('email')} 
                  type="email"
                  isInvalid={!!errors.email} 
                  placeholder="company@example.com" 
                />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Col>
              <Col md={12}>
                <Form.Label>Address</Form.Label>
                <Form.Control 
                  {...register('address')} 
                  as="textarea"
                  rows={2}
                  isInvalid={!!errors.address} 
                  placeholder="Complete address" 
                />
                <Form.Control.Feedback type="invalid">{errors.address?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Contact Number</Form.Label>
                <Form.Control 
                  {...register('contactNumber')} 
                  isInvalid={!!errors.contactNumber} 
                  placeholder="e.g. +91 9876543210" 
                />
                <Form.Control.Feedback type="invalid">{errors.contactNumber?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>GSTIN</Form.Label>
                <Form.Control 
                  {...register('gstin')} 
                  isInvalid={!!errors.gstin} 
                  placeholder="e.g. 29ABCDE1234F1Z5" 
                />
                <Form.Control.Feedback type="invalid">{errors.gstin?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Financial Year Start</Form.Label>
                <Form.Control 
                  {...register('financialYearStart')} 
                  type="date"
                  isInvalid={!!errors.financialYearStart} 
                />
                <Form.Control.Feedback type="invalid">{errors.financialYearStart?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Financial Year End</Form.Label>
                <Form.Control 
                  {...register('financialYearEnd')} 
                  type="date"
                  isInvalid={!!errors.financialYearEnd} 
                />
                <Form.Control.Feedback type="invalid">{errors.financialYearEnd?.message}</Form.Control.Feedback>
              </Col>
              <Col md={12}>
                <Form.Check 
                  type="switch" 
                  label="Active Status" 
                  {...register('isActive')} 
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
            <Button type="submit" variant="success" disabled={isSubmitting}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}