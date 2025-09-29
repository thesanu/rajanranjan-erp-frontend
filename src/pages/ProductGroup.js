import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table, Button, Modal, Form, InputGroup } from "react-bootstrap";
import {
  BsPlus,
  BsFilter,
  BsSearch,
  BsDownload,
  BsFileEarmarkArrowDown,
  BsUpload,
  BsArrowDownUp,
} from "react-icons/bs";
import Swal from "sweetalert2";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const PAGE_SIZE = 10;

export default function ProductGroup() {
  const { user } = useAuth();
  const isGlobal = user?.role === "GlobalAdmin";
  const isAdmin = user?.role === "Admin";

  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("groupName");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    groupName: "",
    description: "",
    companyProfileId: isGlobal ? "" : user?.companyId,
    isActive: true,
  });

  const fileInputRef = useRef();

  useEffect(() => {
    fetchGroups();
    if (isGlobal) fetchCompanies();
  }, [companyFilter]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      let url = "/ProductGroup";
      const params = new URLSearchParams();

      if (isAdmin && user?.companyId) {
        params.append("companyProfileId", user.companyId);
      }
      if (isGlobal && companyFilter) {
        params.append("companyProfileId", companyFilter);
      }

      if (params.toString()) url += `?${params.toString()}`;
      const res = await api.get(url);
      setGroups(res.data || []);
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/CompanyProfile");
      setCompanies(res.data || []);
    } catch {
      console.error("Failed to fetch companies");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      groupName: "",
      description: "",
      companyProfileId: isGlobal ? "" : user?.companyId,
      isActive: true,
    });
    setShow(true);
  };

  const openEdit = (g) => {
    setEditing(g);
    setForm({
      groupName: g.groupName || "",
      description: g.description || "",
      companyProfileId: g.companyProfileId || "",
      isActive: g.isActive ?? true,
    });
    setShow(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      groupName: form.groupName.trim(),
      description: form.description?.trim() || "",
      isActive: form.isActive,
      ...(isGlobal
        ? { companyProfileId: Number(form.companyProfileId) }
        : isAdmin && user?.companyId
        ? { companyProfileId: Number(user.companyId) }
        : {}),
      ...(editing ? { groupID: editing.groupID } : {}),
    };

    try {
      if (editing) {
        await api.put(`/ProductGroup/${editing.groupID}`, payload);
        toast.success("Group updated");
      } else {
        await api.post("/ProductGroup", payload);
        toast.success("Group created");
      }
      setShow(false);
      fetchGroups();
    } catch {
      toast.error("Save failed");
    }
  };

  const confirmDelete = async (row) => {
    const res = await Swal.fire({
      title: "Delete this group?",
      text: row.groupName,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;
    try {
      await api.delete(`/ProductGroup/${row.groupID}`);
      toast.success("Deleted");
      fetchGroups();
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let rows = [...groups];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.groupName || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
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
  }, [groups, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export / Import
  const exportCSV = () => {
    const csv = Papa.unparse(filtered);
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "groups.csv");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Groups");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "groups.xlsx");
  };

  const downloadSample = () => {
    const sample = [
      {
        groupName: "Electronics",
        description: "Example",
        ...(isGlobal ? { companyProfileId: "" } : {}),
        isActive: true,
      },
    ];
    const csv = Papa.unparse(sample);
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "group_sample.csv");
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    const processRows = async (rows) => {
      for (const r of rows) {
        if (!r.groupName) continue;
        try {
          await api.post("/ProductGroup", {
            groupName: r.groupName,
            description: r.description || "",
            isActive: r.isActive === "false" ? false : true,
            ...(isGlobal && r.companyProfileId
              ? { companyProfileId: Number(r.companyProfileId) }
              : isAdmin && user?.companyId
              ? { companyProfileId: Number(user.companyId) }
              : {}),
          });
        } catch {
          // skip errors
        }
      }
      toast.success("Import completed");
      fetchGroups();
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data),
      });
    } else if (ext === "xlsx" || ext === "xls") {
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
        <h5 className="mb-0">Product Groups</h5>
        <Button
          size="sm"
          onClick={openCreate}
          style={{
            backgroundColor: "#0d6efd",
            borderRadius: "50px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          }}
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
                <InputGroup.Text>
                  <BsFilter />
                </InputGroup.Text>
                <Form.Select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
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
              <InputGroup.Text>
                <BsSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>

          <div className="col-md-auto d-flex flex-wrap gap-2">
            <Button size="sm" onClick={exportCSV}>
              <BsDownload className="me-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportExcel} variant="success">
              <BsDownload className="me-1" /> Excel
            </Button>
            <Button size="sm" onClick={downloadSample} variant="warning">
              <BsFileEarmarkArrowDown className="me-1" /> Sample
            </Button>
            <Form.Group controlId="import" className="mb-0">
              <Form.Label className="btn btn-sm mb-0 btn-primary">
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
              <th role="button" onClick={() => toggleSort("groupName")}>
                Group Name <BsArrowDownUp className="ms-1" />
              </th>
              <th>Description</th>
              {isGlobal && <th>Company</th>}
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isGlobal ? 5 : 4}>Loading...</td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={isGlobal ? 5 : 4} className="text-center">
                  No data
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.groupID}>
                  <td>{r.groupName}</td>
                  <td>{r.description}</td>
                  {isGlobal && (
                    <td>
                      {companies.find((c) => c.companyID == r.companyProfileId)
                        ?.companyName || "-"}
                    </td>
                  )}
                  <td>{r.isActive ? "Active" : "Inactive"}</td>
                  <td className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => confirmDelete(r)}
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
          Showing {(page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </small>
        <div className="btn-group btn-group-sm">
          <Button
            variant="outline-secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline-secondary"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modal */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-6">
              {editing ? "Edit Group" : "New Group"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Group Name</Form.Label>
              <Form.Control
                value={form.groupName}
                onChange={(e) =>
                  setForm({ ...form, groupName: e.target.value })
                }
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Description</Form.Label>
              <Form.Control
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Form.Group>

            {isGlobal && (
              <Form.Group className="mb-2">
                <Form.Label>Company</Form.Label>
                <Form.Select
                  value={form.companyProfileId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      companyProfileId: Number(e.target.value),
                    })
                  }
                  required
                >
                  <option value="">-- Select Company --</option>
                  {companies.map((c) => (
                    <option key={c.companyID} value={c.companyID}>
                      {c.companyName} ({c.companyID})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            <Form.Check
              type="checkbox"
              label="Active"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Save
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
