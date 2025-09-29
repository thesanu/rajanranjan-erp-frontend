// src/components/ui/Input.js

import React from 'react';
import { Form } from 'react-bootstrap';
import classNames from 'classnames';

export const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder = '',
  className = '',
  ...props
}) => {
  return (
    <Form.Group className="mb-3">
      {label && <Form.Label htmlFor={name}>{label}</Form.Label>}
      <Form.Control
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={classNames(className, { 'is-invalid': error })}
        {...props}
      />
      {error && <Form.Text className="text-danger">{error.message}</Form.Text>}
    </Form.Group>
  );
};
