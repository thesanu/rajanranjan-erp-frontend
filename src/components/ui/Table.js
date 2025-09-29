import React from "react";

export const Table = ({ children, className = "" }) => (
  <table className={`min-w-full border-collapse border border-gray-300 ${className}`}>
    {children}
  </table>
);

export const TableHeader = ({ children, className = "" }) => (
  <thead className={`bg-gray-100 ${className}`}>{children}</thead>
);

export const TableBody = ({ children, className = "" }) => (
  <tbody className={className}>{children}</tbody>
);

export const TableRow = ({ children, className = "" }) => (
  <tr className={`border-b border-gray-200 hover:bg-gray-50 ${className}`}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", as = "td", ...props }) => {
  const Tag = as;
  return (
    <Tag
      className={`px-4 py-2 border border-gray-300 text-left align-middle ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};
