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
import { BsPlus, BsDownload, BsUpload, BsFileEarmarkArrowDown, BsSearch, BsArrowDownUp, BsFilter } from "react-icons/bs";
import { BeatLoader } from "react-spinners";

import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const PAGE_SIZE = 13;

export default function Ledger() {
  const { user } = useAuth();
  const isGlobal = user?.role === "GlobalAdmin";
  const isAdmin = user?.role === "Admin";

  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("ledgerName");
  const [sortDir, setSortDir] = useState("asc");
  const [companyFilter, setCompanyFilter] = useState("");
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null);

  const schema = yup.object({
    ledgerName: yup.string().required("Ledger name is required"),
    groupID: yup.string().required("Group is required"),
    openingBalance: yup.number().min(0, "Balance cannot be negative").nullable(),
    balanceType: yup.string().oneOf(["D", "C"]).required(),
    isActive: yup.boolean(),
    email: yup.string().email("Invalid email").nullable(),
    ...(isGlobal && {
      companyProfileId: yup
        .number()
        .typeError("Company ID must be a number")
        .required("Company is required"),
    }),
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
      ...(isGlobal ? { companyProfileId: "" } : {}),
    }
  });

  const fetchGroups = async () => {
    try {
      const res = await api.get("/AccountGroup");
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to load groups", err);
    }
  };

  const fetchCompanies = async () => {
    if (!isGlobal) return;
    try {
      const res = await api.get("/CompanyProfile");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Failed to load companies", err);
    }
  };

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      setError("");
      let url = "/Ledger";
      const params = new URLSearchParams();

      if (isAdmin && user?.companyId) {
        params.append("companyProfileId", user.companyId);
      }

      if (isGlobal && companyFilter && !isNaN(companyFilter)) {
        params.append("companyProfileId", companyFilter);
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await api.get(url);
      setLedgers(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load ledgers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchLedgers();
  }, [companyFilter]);

  const openCreate = () => {
    setEditing(null);
    reset({
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
      ...(isGlobal ? { companyProfileId: "" } : {}),
    });
    setShow(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    reset({
      ...row,
      groupID: row.groupID?.toString(),
      ...(isGlobal ? { companyProfileId: row.companyProfileId?.toString() } : {}),
    });
    setShow(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      groupID: Number(data.groupID),
      openingBalance: data.openingBalance ? Number(data.openingBalance) : 0,
      ...(isGlobal ? { companyProfileId: Number(data.companyProfileId) } : {}),
      ledgerID: editing?.ledgerID,
    };

    if (!isGlobal && isAdmin && user?.companyId) {
      payload.companyProfileId = user.companyId;
    }

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
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    let rows = [...ledgers];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => {
        const gname = groups.find(g => g.groupID === r.groupID)?.groupName || "";
        return r.ledgerName.toLowerCase().includes(q) || gname.toLowerCase().includes(q);
      });
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
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const exportExcel = () => {
    const exportData = filtered.map(row => {
      const groupName = groups.find(g => g.groupID === row.groupID)?.groupName || "";
      const companyName = isGlobal ? (companyMap[row.companyProfileId] || "") : "";

      return {
        ledgerName: row.ledgerName,
        groupName: groupName,
        openingBalance: row.openingBalance || 0,
        balanceType: row.balanceType,
        isActive: row.isActive,
        address: row.address || "",
        city: row.city || "",
        state: row.state || "",
        pincode: row.pincode || "",
        phone: row.phone || "",
        email: row.email || "",
        gstin: row.gstin || "",
        pan: row.pan || "",
        ...(isGlobal ? { companyName } : {}),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledgers");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "ledgers.xlsx");
  };

  const exportCSV = () => {
    const exportData = filtered.map(row => {
      const groupName = groups.find(g => g.groupID === row.groupID)?.groupName || "";
      const companyName = isGlobal ? (companyMap[row.companyProfileId] || "") : "";

      return {
        ledgerName: row.ledgerName,
        groupName: groupName,
        openingBalance: row.openingBalance || 0,
        balanceType: row.balanceType,
        isActive: row.isActive,
        address: row.address || "",
        city: row.city || "",
        state: row.state || "",
        pincode: row.pincode || "",
        phone: row.phone || "",
        email: row.email || "",
        gstin: row.gstin || "",
        pan: row.pan || "",
        ...(isGlobal ? { companyName } : {}),
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "ledgers.csv");
  };

  const downloadSample = () => {
    const sample = [
      {
        ledgerName: "Cash Account",
        groupName: "Current Assets",
        openingBalance: 0,
        balanceType: "D",
        isActive: true,
        address: "123 Market St",
        city: "New York",
        state: "NY",
        pincode: "10001",
        phone: "5551234567",
        email: "cash@example.com",
        gstin: "22AAAAA0000A1Z5",
        pan: "ABCDE1234F",
        ...(isGlobal ? { companyName: "Example Company" } : {}),
      },
    ];

    const csv = Papa.unparse(sample);
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "ledger_sample.csv");
  };

const safeBoolean = (val) => {
  if (typeof val === "boolean") return val;
  if (!val) return false;
  const str = val.toString().toLowerCase().trim();
  return str === "true" || str === "1" || str === "yes";
};


  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importing) {
      toast.warning("Import already in progress");
      return;
    }

    setImporting(true);
    toast.info("Importing... Please wait", { autoClose: false, toastId: "import-loading" });

   const normalize = (str) => (str || "").replace(/\s+/g, " ").trim().toLowerCase();

const processRows = async (rows) => {
  let successCount = 0;
  let errorCount = 0;
  const errors = []; // Collect error details

  for (const r of rows) {
    if (!r.ledgerName || (!r.groupName && !r.groupID)) {
      errors.push(`Row with ledger "${r.ledgerName || 'Unknown'}" missing required fields`);
      errorCount++;
      continue;
    }

    try {
      // Find groupID from groupName
      let groupID = null;
      if (r.groupName) {
        const group = groups.find(g => normalize(g.groupName) === normalize(r.groupName));
        if (!group) {
          console.warn(`Group not found: "${r.groupName}"`);
          errors.push(`Group "${r.groupName}" not found for ledger "${r.ledgerName}"`);
          errorCount++;
          continue;
        }
        groupID = group.groupID;
      } else if (r.groupID) {
        groupID = Number(r.groupID);
      }

      // Find companyProfileId from companyName for Global Admin
      let companyProfileId = null;
      if (isGlobal) {
        if (r.companyName) {
          const company = companies.find(c => normalize(c.companyName) === normalize(r.companyName));
          if (!company) {
            console.warn(`Company not found: "${r.companyName}"`);
            errors.push(`Company "${r.companyName}" not found for ledger "${r.ledgerName}"`);
            errorCount++;
            continue;
          }
          companyProfileId = company.companyID;
        } else if (r.companyProfileId) {
          companyProfileId = Number(r.companyProfileId);
        }
      }

      const payload = {
        ledgerName: r.ledgerName,
        groupID,
        openingBalance: r.openingBalance ? Number(r.openingBalance) : 0,
        balanceType: (r.balanceType || "").toUpperCase() === "C" ? "C" : "D",
        isActive: safeBoolean(r.isActive),
        address: r.address || "",
        city: r.city || "",
        state: r.state || "",
        pincode: r.pincode || "",
        phone: r.phone || "",
        email: r.email || "",
        gstin: r.gstin || "",
        pan: r.pan || "",
        ...(isGlobal ? { companyProfileId } : {}),
        ...(isAdmin && !isGlobal && user?.companyId ? { companyProfileId: user.companyId } : {}),
      };

      await api.post("/Ledger", payload);
      successCount++;
    } catch (err) {
      console.warn("Skipped row due to error:", r, err);
      errors.push(`Failed to import ledger "${r.ledgerName}": ${err?.response?.data?.message || 'Unknown error'}`);
      errorCount++;
    }
  }

  toast.dismiss("import-loading");

  if (successCount > 0) {
    toast.success(`Import completed: ${successCount} records added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
  } else {
    toast.error(`Import failed: ${errorCount} records had errors`);
  }

  if (errors.length > 0) {
    const errorSummary = errors.slice(0, 5).join('\n');
    const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '';
    toast.error(`Import errors:\n${errorSummary}${moreErrors}`, { autoClose: 8000 });
  }

  fetchLedgers();
  if (fileInputRef.current) fileInputRef.current.value = "";
  setImporting(false);
};

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (res) => await processRows(res.data),
      });
    } else if (["xlsx", "xls"].includes(ext)) {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      await processRows(json);
    } else {
      toast.error("Unsupported file type");
      setImporting(false);
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
        <h5 className="mb-0" style={{ color: 'rgba(17, 82, 73, 0.95)' }}>Ledger Master</h5>
        <Button
          size="sm"
          onClick={openCreate}
          style={{
            backgroundColor: "#0d6efd",
            borderColor: "#0a58ca",
            borderRadius: "50px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            color: "#fff"
          }}
        >
          <BsPlus className="me-1" /> Add
        </Button>
      </div>

      <div className="border p-2 bg-light mb-2">
        <div className="row gx-2 gy-2 align-items-center">
          {isGlobal && (
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
          )}

          <div className="col-auto">
            <InputGroup size="sm">
              <InputGroup.Text><BsSearch /></InputGroup.Text>
              <Form.Control
                placeholder="Search..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>

          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={exportCSV}
              style={{
                backgroundColor: "#0dcaf0",
                borderColor: "#31d2f2",
                borderRadius: "50px",
                color: "#fff"
              }}
            >
              <BsDownload className="me-1" /> CSV
            </Button>

            <Button
              size="sm"
              onClick={exportExcel}
              style={{
                backgroundColor: "#198754",
                borderColor: "#146c43",
                borderRadius: "50px",
                color: "#fff"
              }}
            >
              <BsDownload className="me-1" /> Excel
            </Button>

            <Button
              size="sm"
              onClick={downloadSample}
              style={{
                backgroundColor: "#d4a017",
                borderColor: "#b3880e",
                borderRadius: "50px",
                color: "#fff"
              }}
            >
              <BsFileEarmarkArrowDown className="me-1" /> Sample
            </Button>

            <Form.Group controlId="import" className="mb-0">
              <Form.Label
                className="btn btn-sm mb-0"
                style={{
                  cursor: importing ? "not-allowed" : "pointer",
                  backgroundColor: importing ? "#6c757d" : "#0d6efd",
                  borderColor: importing ? "#5c636a" : "#0a58ca",
                  borderRadius: "50px",
                  color: "#fff",
                  opacity: importing ? 0.65 : 1
                }}
              >
                <BsUpload /> {importing ? "Importing..." : "Import"}
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={onImportFile}
                  disabled={importing}
                  hidden
                />
              </Form.Label>
            </Form.Group>
          </div>
        </div>
      </div>

      <div className="table-responsive border bg-white">
        <Table hover size="sm" className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th role="button" onClick={() => toggleSort("ledgerName")}>Name <BsArrowDownUp /></th>
              <th>Group</th>
              <th role="button" onClick={() => toggleSort("openingBalance")}>Opening Balance <BsArrowDownUp /></th>
              <th>Type</th>
              <th>Active</th>
              {isGlobal && <th>Company</th>}
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isGlobal ? 7 : 6} className="text-center py-4">
                  <BeatLoader
                    size={10}
                    margin={4}
                    color="#177366"
                    loading={true}
                    speedMultiplier={1.5}
                  />
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={isGlobal ? 7 : 6} className="text-center py-4">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map(r => (
                <tr key={r.ledgerID}>
                  <td>{r.ledgerName}</td>
                  <td>{groups.find(g => g.groupID === r.groupID)?.groupName || r.groupID}</td>
                  <td>{r.openingBalance}</td>
                  <td>{r.balanceType}</td>
                  <td>{r.isActive ? "Yes" : "No"}</td>
                  {isGlobal && <td>{companyMap[r.companyProfileId] || r.companyProfileId}</td>}
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => openEdit(r)}
                        style={{ backgroundColor: "#4CAF50", color: "#fff", borderRadius: "50px" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => confirmDelete(r)}
                        style={{ backgroundColor: "#e02e2a", color: "#fff", borderRadius: "50px" }}
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
        <small className="text-muted">
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </small>
        <div className="btn-group btn-group-sm">
          <Button variant="outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered size="lg">
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton className="custom-modal-header">
            <Modal.Title className="fs-6 modal-title-custom">{editing ? "Edit Ledger" : "New Ledger"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <Form.Group className="mb-2">
              <Form.Label>Ledger Name</Form.Label>
              <Form.Control {...register("ledgerName")} isInvalid={!!errors.ledgerName} />
              <Form.Control.Feedback type="invalid">{errors.ledgerName?.message}</Form.Control.Feedback>
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label>Company</Form.Label>
                <Form.Select {...register("companyProfileId")} isInvalid={!!errors.companyProfileId}>
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

            <Form.Group className="mb-2">
              <Form.Label>Account Group</Form.Label>
              <Form.Select {...register("groupID")} isInvalid={!!errors.groupID}>
                <option value="">-- Select Group --</option>
                {groups.map(g => (
                  <option key={g.groupID} value={g.groupID}>{g.groupName}</option>
                ))}
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
            <Button variant="secondary" size="sm" onClick={() => setShow(false)} style={{ borderRadius: "50px" }}>Cancel</Button>
            <Button type="submit" variant="success" size="sm" disabled={isSubmitting} style={{ borderRadius: "50px" }}>
              {isSubmitting ? "Saving..." : (editing ? "Update" : "Create")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>
        {`
          .modal-title-custom {
            color: #fff;
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