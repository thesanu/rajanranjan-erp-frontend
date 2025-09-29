import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
// src/index.js or src/main.jsx
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';
import './index.css'; // your own styles (optional)




import { BrowserRouter as Router } from 'react-router-dom';  // <-- Import Router here

// Render the app with Router wrapping around it
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>  {/* Wrap your whole app with Router */}
      <App />
    </Router>
  </React.StrictMode>
);

serviceWorkerRegistration.unregister();
reportWebVitals();
