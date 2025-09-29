import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, InputGroup, Modal, Table } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { BsPlus, BsDownload, BsUpload, BsFileEarmarkArrowDown, BsSearch, BsArrowDownUp } from "react-icons/bs";
import api from "../services/api";

const PAGE_SIZE = 10;

export default function Ledger() {
  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("ledgerName");
  const [sortDir, setSortDir] = useState("asc");

  const fileInputRef = useRef(null);

  // ✅ Validation schema
  const schema = yup.object({
    ledgerName: yup.string().required("Ledger name is required"),
    groupID: yup.string().required("Group is required"),
    openingBalance: yup.number().min(0, "Balance cannot be negative").nullable(),
    balanceType: yup.string().oneOf(["D", "C"]).required(),
    isActive: yup.boolean(),
    email: yup.string().email("Invalid email").nullable(),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      ledgerName: "",
      groupID: "",
      openingBalance: "",
      balanceType: "D",
      isActive: true,
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      gstin: "",
      pan: "",
    }
  });

  // ✅ Fetch Ledgers
  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/Ledger");
      setLedgers(res.data || []);
    } catch (err) {
      setError("Failed to load ledgers");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Groups
  const fetchGroups = async () => {
    try {
      const res = await api.get("/AccountGroup");
      setGroups(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLedgers();
    fetchGroups();
  }, []);

  // ✅ Create / Edit Modal
  const openCreate = () => {
    setEditing(null);
    reset();
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({ ...row, groupID: row.groupID?.toString() });
    setShow(true);
  };

  // ✅ Submit Ledger
  const onSubmit = async (data) => {
    const payload = {
      ...data,
      groupID: Number(data.groupID),
      openingBalance: data.openingBalance ? Number(data.openingBalance) : 0,
      ledgerID: editing?.ledgerID,
    };

    try {
      if (editing) {
        await api.put(`/Ledger/${editing.ledgerID}`, payload);
        toast.success("Ledger updated");
      } else {
        await api.post("/Ledger", payload);
        toast.success("Ledger created");
      }
      setShow(false);
      fetchLedgers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    }
  };

  // ✅ Delete Ledger
  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: "Delete this ledger?",
      text: row.ledgerName,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/Ledger/${row.ledgerID}`);
      toast.success("Ledger deleted");
      fetchLedgers();
    } catch {
      toast.error("Delete failed");
    }
  };

  // ✅ Search + Sort
  const filtered = useMemo(() => {
    let rows = [...ledgers];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.ledgerName.toLowerCase().includes(q) ||
        groups.find(g => g.groupID === r.groupID)?.groupName?.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [ledgers, search, sortKey, sortDir, groups]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ✅ Export CSV/Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledgers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "ledgers.xlsx");
  };

  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "ledgers.csv");
  };

  const downloadSample = () => {
    const sample = [
      { ledgerName: "Cash Account", groupID: 1, openingBalance: 0, balanceType: "D", isActive: true },
      { ledgerName: "Sales", groupID: 2, openingBalance: 0, balanceType: "C", isActive: true }
    ];
    const csv = Papa.unparse(sample);
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "ledger_sample.csv");
  };

  // ✅ Import File
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.ledgerName || !r.groupID) continue;
        try {
          await api.post("/Ledger", {
            ...r,
            groupID: Number(r.groupID),
            openingBalance: r.openingBalance ? Number(r.openingBalance) : 0,
          });
        } catch { /* skip bad rows */ }
      }
      toast.success("Import completed");
      fetchLedgers();
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data)
      });
    } else if (["xlsx", "xls"].includes(ext)) {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      processRows(json);
    } else {
      toast.error("Unsupported file type");
    }
  };

  return (
  <div className="container-fluid">
    {/* Header */}
    <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
      <h5 className="mb-0">Ledger Master</h5>
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
          color: '#fff'
        }}
      >
        <BsPlus className="me-1" /> Add
      </Button>
    </div>

    {/* Company Filter */}
              {/* {isGlobal && (
                <div className="col-auto">
                  <InputGroup size="sm">
                    <InputGroup.Text><BsFilter /></InputGroup.Text>
                    <Form.Select
                      value={companyFilter}
                      onChange={(e) => {
                        setCompanyFilter(e.target.value);
                        setPage(1);
                      }}
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
              )} */}
    

    {/* Filters */}
    <div className="border p-2 bg-light mb-2">
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <InputGroup size="sm" className="w-auto">
          <InputGroup.Text><BsSearch /></InputGroup.Text>
          <Form.Control placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </InputGroup>

        <Button
          size="sm"
          onClick={exportCSV}
          style={{
            backgroundColor: '#0dcaf0',
            borderColor: '#31d2f2',
            borderRadius: '50px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            padding: '0.25rem 0.75rem',
            color: '#fff'
          }}
        >
          <BsDownload className="me-1" /> CSV
        </Button>

        <Button
          size="sm"
          onClick={exportExcel}
          style={{
            backgroundColor: '#198754',
            borderColor: '#146c43',
            borderRadius: '50px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            padding: '0.25rem 0.75rem',
            color: '#fff'
          }}
        >
          <BsDownload className="me-1" /> Excel
        </Button>

        <Button
          size="sm"
          onClick={downloadSample}
          style={{
            backgroundColor: '#d4a017',
            borderColor: '#b3880e',
            borderRadius: '50px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            padding: '0.25rem 0.75rem',
            color: '#fff'
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
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              padding: '0.25rem 0.75rem',
              color: '#fff'
            }}
          >
            <BsUpload /> Import
            <Form.Control ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onImportFile} hidden />
          </Form.Label>
        </Form.Group>
      </div>
    </div>

    {/* Table */}
    <div className="table-responsive border bg-white">
      <Table hover size="sm" className="mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th role="button" onClick={() => toggleSort("ledgerName")}>Name <BsArrowDownUp /></th>
            <th>Group</th>
            <th role="button" onClick={() => toggleSort("openingBalance")}>Opening Balance <BsArrowDownUp /></th>
            <th>Type</th>
            <th>Active</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}>Loading...</td></tr>
          ) : pageRows.length === 0 ? (
            <tr><td colSpan={6} className="text-center">No ledgers</td></tr>
          ) : (
            pageRows.map(r => (
              <tr key={r.ledgerID}>
                <td>{r.ledgerName}</td>
                <td>{groups.find(g => g.groupID === r.groupID)?.groupName || r.groupID}</td>
                <td>{r.openingBalance}</td>
                <td>{r.balanceType}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
                <td className="text-end">
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => openEdit(r)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: '#fff',
                        borderRadius: '50px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.25)',
                        padding: '0.25rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => confirmDelete(r)}
                      style={{
                        backgroundColor: '#e02e2a',
                        color: '#fff',
                        borderRadius: '50px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.25)',
                        padding: '0.25rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
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
        <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>

    {/* Modal */}
    <Modal show={show} onHide={() => setShow(false)} centered size="lg">
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">{editing ? "Edit Ledger" : "New Ledger"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger py-1">{error}</div>}

          <Form.Group className="mb-2">
            <Form.Label>Ledger Name</Form.Label>
            <Form.Control {...register("ledgerName")} isInvalid={!!errors.ledgerName} />
            <Form.Control.Feedback type="invalid">{errors.ledgerName?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Account Group</Form.Label>
            <Form.Select {...register("groupID")} isInvalid={!!errors.groupID}>
              <option value="">-- Select Group --</option>
              {groups.map(g => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.groupID?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Opening Balance</Form.Label>
            <Form.Control type="number" step="any" {...register("openingBalance")} isInvalid={!!errors.openingBalance} />
            <Form.Control.Feedback type="invalid">{errors.openingBalance?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Balance Type</Form.Label>
            <Form.Select {...register("balanceType")} isInvalid={!!errors.balanceType}>
              <option value="D">Debit (D)</option>
              <option value="C">Credit (C)</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.balanceType?.message}</Form.Control.Feedback>
          </Form.Group>

          <Form.Check type="switch" label="Active" {...register("isActive")} className="mt-2" />

          <Form.Group className="mb-2">
            <Form.Label>Address</Form.Label>
            <Form.Control {...register("address")} />
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>City</Form.Label>
              <Form.Control {...register("city")} />
            </Form.Group>
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>State</Form.Label>
              <Form.Control {...register("state")} />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>Pincode</Form.Label>
              <Form.Control {...register("pincode")} />
            </Form.Group>
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>Phone</Form.Label>
              <Form.Control {...register("phone")} />
            </Form.Group>
          </div>

          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" {...register("email")} isInvalid={!!errors.email} />
            <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>GSTIN</Form.Label>
              <Form.Control {...register("gstin")} />
            </Form.Group>
            <Form.Group className="mb-2 col-md-6">
              <Form.Label>PAN</Form.Label>
              <Form.Control {...register("pan")} />
            </Form.Group>
          </div>
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
              justifyContent: 'center'
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
              justifyContent: 'center'
            }}
          >
            {isSubmitting ? "Saving..." : editing ? "Update" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  </div>
);
}