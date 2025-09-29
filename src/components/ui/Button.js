import React from 'react';
import { Spinner } from 'react-bootstrap';
import classNames from 'classnames';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary', // bootstrap variants like 'primary', 'outline-secondary', etc.
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const classes = classNames(`btn btn-${variant}`, className);

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading && <Spinner animation="border" size="sm" className="me-2" />}
      {children}
    </button>
  );
};
