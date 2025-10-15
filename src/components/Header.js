// import React from "react";
// import { useAuth } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

// const Header = () => {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   return (
//     <nav className="navbar navbar-expand navbar-light bg-light px-3">
//       <img
//                  src="/logo192.png"
//                 alt="Logo"
//                 className="logo"
//                 // style={{ width: '100%', height: 'auto', objectFit: 'contain' }} // fit container, no crop, no rounding
//               />

//       <div className="ms-auto">
//         {user && (
//           <>
//             <span className="me-3">Hi, {user.fullName}</span>
//             {/* <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
//               Logout
//             </button> */}
//           </>
//         )}
//       </div>
//     </nav>
//   );
// };

// export default Header;
