import React from 'react';
import { Card as BsCard } from 'react-bootstrap';
import classNames from 'classnames';

export const Card = ({ title, children, className = '', bodyClass = '', ...props }) => {
  return (
    <BsCard className={classNames('shadow-sm', className)} {...props}>
      {title && <BsCard.Header className="fw-bold">{title}</BsCard.Header>}
      <BsCard.Body className={bodyClass}>
        {children}
      </BsCard.Body>
    </BsCard>
  );
};
