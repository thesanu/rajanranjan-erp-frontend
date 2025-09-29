import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import FocusTrap from "focus-trap-react";

const Dialog = ({ open, onClose, children, ariaLabel }) => {
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden"; // prevent background scroll
      window.addEventListener("keydown", onEsc);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <FocusTrap
      focusTrapOptions={{
        clickOutsideDeactivates: true,
        onDeactivate: onClose,
      }}
    >
      <div
        aria-modal="true"
        role="dialog"
        aria-label={ariaLabel}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative"
          onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside dialog
          tabIndex={-1}
        >
          {children}
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </FocusTrap>,
    document.body
  );
};

export const DialogHeader = ({ children }) => (
  <header className="mb-4 border-b border-gray-200">{children}</header>
);

export const DialogTitle = ({ children }) => (
  <h2 className="text-xl font-semibold text-gray-900">{children}</h2>
);

export const DialogContent = ({ children }) => (
  <div className="mb-4 text-gray-700">{children}</div>
);

export const DialogFooter = ({ children }) => (
  <footer className="flex justify-end space-x-2">{children}</footer>
);

export default Dialog;
