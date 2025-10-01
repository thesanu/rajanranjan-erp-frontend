import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const mastersLinks = [
  { to: "/account-group", label: "Account Group", icon: "bi-people-fill" },
  { to: "/ledger", label: "Ledger", icon: "bi-journal-text" },
  { to: "/unit", label: "Unit", icon: "bi-rulers" },
  { to: "/product", label: "Product", icon: "bi-box-seam" },
  { to: "/product-group", label: "Product Group", icon: "bi-tags-fill" },
  { to: "/design", label: "Design", icon: "bi-brush" },
  { to: "/size", label: "Size", icon: "bi-arrows-expand" },
  { to: "/mill", label: "Mill", icon: "bi-building" },
  { to: "/location", label: "Location", icon: "bi-geo-alt-fill" },
  { to: "/voucher-type", label: "Voucher Type", icon: "bi-journal-check" },
  { to: "/tax-rate", label: "Tax Rate", icon: "bi-percent" },
  { to: "/area", label: "Area", icon: "bi-geo" }
];

const reportsLinks = [
  { to: "/reports/ledger", label: "Ledger Report", icon: "bi-file-earmark-text" },
  { to: "/reports/trial-balance", label: "Trial Balance", icon: "bi-balance-scale" },
  { to: "/reports/profit-loss", label: "Profit & Loss", icon: "bi-cash-stack" },
  { to: "/reports/balance-sheet", label: "Balance Sheet", icon: "bi-receipt" },
  { to: "/reports/stock-summary", label: "Stock Summary", icon: "bi-clipboard-data" },
  { to: "/reports/item-ledger", label: "Item Ledger", icon: "bi-journal-bookmark" },
  { to: "/reports/transaction-summary", label: "Transaction Summary", icon: "bi-graph-up" }
];

const transactionLinks = [
  { to: "/voucher", label: "Voucher", icon: "bi-journal-arrow-up" },
  { to: "/opening-stock", label: "Opening Stock", icon: "bi-boxes" },
  { to: "/opening-balance", label: "Opening Balance", icon: "bi-cash-coin" }
];

const utilityLinks = [
  { to: "/company-profile", label: "Company Profile", icon: "bi-building-gear" },
  { to: "/backup", label: "Backup Tools", icon: "bi-cloud-arrow-up-fill" },
  { to: "/user", label: "Users", icon: "bi-person-lines-fill" },
  { to: "/settings", label: "Settings", icon: "bi-gear" }
];

const SidebarSection = ({ title, icon, links, isOpen, onToggle }) => (
  <div className="sidebar-section">
    <button
      className={`sidebar-section-header ${isOpen ? "open" : ""}`}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span>
        <i className={`bi ${icon} me-2`}></i>
        {title}
      </span>
      <i className={`bi ${isOpen ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
    </button>
    {isOpen && (
      <nav className="sidebar-links" aria-label={`${title} links`}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            to={to}
            key={to}
            className={({ isActive }) =>
              `sidebar-link d-flex align-items-center ${isActive ? "active" : ""}`
            }
          >
            <i className={`bi ${icon} me-3`}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    )}
  </div>
);

const MainLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [openSection, setOpenSection] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSection = (section) =>
    setOpenSection((prev) => (prev === section ? null : section));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Animated gradient background wrapper */}
      <div className="app-bg" aria-hidden="true" />

      {/* Mobile Top Navbar */}
      <header className="topbar d-md-none">
        <button
          className="btn btn-light"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <i className="bi bi-list fs-3"></i>
        </button>
        <div className="topbar-brand">ERP</div>
        <button
          className="btn btn-danger"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </header>

      <div className="app-layout d-flex">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Sidebar">
          <div className="sidebar-header d-flex align-items-center justify-content-between p-3">
            <Link to="/" className="d-flex align-items-center gap-3 logo-link" aria-label="Home">
              <img
                src="/logo192.png"
                alt="Logo"
                className="logo"
                style={{ width: '100%', height: 'auto', objectFit: 'contain' }} // fit container, no crop, no rounding
              />

            </Link>
            {/* Removed the close button */}
          </div>


          <div className="sidebar-content p-3 overflow-auto">
            <SidebarSection
              title="Masters"
              icon="bi-folder-fill"
              links={mastersLinks}
              isOpen={openSection === "masters"}
              onToggle={() => toggleSection("masters")}
            />
            <SidebarSection
              title="Transactions"
              icon="bi-currency-exchange"
              links={transactionLinks}
              isOpen={openSection === "transactions"}
              onToggle={() => toggleSection("transactions")}
            />
            <SidebarSection
              title="Reports"
              icon="bi-bar-chart-line-fill"
              links={reportsLinks}
              isOpen={openSection === "reports"}
              onToggle={() => toggleSection("reports")}
            />
            <SidebarSection
              title="Utilities"
              icon="bi-tools"
              links={utilityLinks}
              isOpen={openSection === "utilities"}
              onToggle={() => toggleSection("utilities")}
            />
          </div>

          <div className="sidebar-footer p-3">
            <button
              className="btn btn-danger w-100"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <i className="bi bi-box-arrow-right me-2"></i> Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="content p-4" role="main">
          <Outlet />
        </main>
      </div>

      {/* Styles */}
      <style>{`

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(6,24,42,0.04);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08); /* Slightly lower and softer */
}


/* ---------- Base resets ---------- */
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
a { text-decoration: none; color: inherit; }

/* ---------- Animated gradient background (full page) ---------- */
.app-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    135deg,
    #fdfcfb 0%,
    #f3e7e9 20%,
    #e3eeff 40%,
    #e7f0fd 60%,
    #fef6e4 80%,
    #fdfcfb 100%
  );
  background-attachment: fixed;
  background-size: cover;
  pointer-events: none;
}
  


/* Slow, subtle shifting */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .app-bg { animation: none; }
}

/* ---------- Layout containers ---------- */
.app-layout {
  height: calc(100vh - 56px);
  display: flex;
}

/* Topbar (mobile) */
.topbar {
  height: 56px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  position: sticky;
  top: 0;
  z-index: 1050;
}


.logo {
  width: 100%;
  height: auto;
  object-fit: contain; /* fits container without cropping */
  border-radius: 0;    /* no rounding */
}
.topbar-brand { font-weight: 700; font-size: 1.25rem; color: #253858; }

/* Sidebar */
.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  transition: transform 0.28s ease, box-shadow 0.28s ease;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  z-index: 1040;
  border-right: 1px solid rgba(14, 30, 37, 0.06);
  /* glass + gradient blend */
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.35));
  backdrop-filter: blur(6px) saturate(1.02);
  box-shadow: 0 8px 30px rgba(6, 24, 42, 0.06);
}

/* Mobile: off-canvas */
@media (max-width: 767.98px) {
  .sidebar { position: fixed; transform: translateX(-100%); box-shadow: 2px 0 20px rgba(0,0,0,0.15); }
  .sidebar.open { transform: translateX(0); }
}

/* Sidebar header tweaks */
.sidebar-header {
  border-bottom: 1px solid rgba(6,24,42,0.04);
  padding: 1rem;
  align-items: center;
}
.logo { width: 48px; height: 48px; object-fit: cover; transition: transform 0.28s ease; cursor: pointer; }
.logo-link:hover .logo { transform: scale(1.03); }
.brand-title { color: #1f3a57; margin: 0; user-select: none; }

/* Sidebar content scrolling */
.sidebar-content { flex-grow: 1; overflow-y: auto; padding-top: 1rem; }

/* Sections */
.sidebar-section { margin-bottom: 1.1rem; }
.sidebar-section-header {
  background: none; border: none; width: 100%;
  font-weight: 600; font-size: 0.98rem; color: #25455f;
  padding: 0.45rem 0.7rem; display:flex; justify-content:space-between; align-items:center;
  cursor:pointer; border-radius: 8px; transition: background-color 0.18s ease, box-shadow 0.18s ease;
}
.sidebar-section-header:hover, .sidebar-section-header.open {
  background: rgba(37,69,95,0.06);
  box-shadow: inset 3px 0 0 0 rgba(37,69,95,0.12);
  color: #0f2a3f;
}

/* Links */
.sidebar-links { margin-top: 0.5rem; display:flex; flex-direction:column; gap: 0.25rem; padding-bottom: 0.5rem; }
.sidebar-link {
  color: #2b4256; padding: 0.48rem 0.9rem; border-radius: 8px; transition: background-color 0.18s ease, box-shadow 0.18s ease; font-size: 0.95rem;
}
.sidebar-link:hover { background: rgba(37,69,95,0.06); color: #12303f; box-shadow: 0 6px 18px rgba(2, 14, 22, 0.06); }
.sidebar-link.active {
  background: linear-gradient(90deg, rgba(28,83,113,0.95), rgba(23,115,102,0.95));
  color: #fff; font-weight:600; box-shadow: 0 8px 24px rgba(6,24,42,0.18);
}
.sidebar-link i { font-size: 1.15rem; margin-right: 0.6rem; transition: transform 0.18s ease; }

/* Footer */
.sidebar-footer { padding: 1rem; border-top: 1px solid rgba(6,24,42,0.04); }

/* Main content (glass card) */
.content {
  flex-grow: 1;
  height: calc(100vh - 56px);
  overflow-y: auto;
  margin: 20px;
  padding: 28px;
  min-width: 0;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.85));
  box-shadow: 0 12px 40px rgba(10, 30, 60, 0.08);
  backdrop-filter: blur(6px) saturate(1.02);
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .app-layout { height: 100vh; }
  .topbar { display: none; }
  .sidebar { position: relative; transform: translateX(0); top: 0; height: 100vh; box-shadow: none; }
  .sidebar-footer { margin-top: auto; }
  .content { margin: 24px; }
}

/* Small screens content spacing */
@media (max-width: 767.98px) {
  .content { margin: 80px 12px 16px 12px; border-radius: 10px; padding: 18px; }
}

/* Utility: make sure focus outlines are visible */
button:focus, a:focus {
  outline: 3px solid rgba(37,69,95,0.16);
  outline-offset: 2px;
  border-radius: 6px;
}
`}</style>
    </>
  );
};

export default MainLayout;
