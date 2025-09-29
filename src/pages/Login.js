import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Form, Button, Card, InputGroup } from 'react-bootstrap';
import { FaUser, FaLock } from 'react-icons/fa';
import classNames from 'classnames';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // ✅ Include your auth context
import '../index.css';

const schema = yup.object().shape({
  username: yup.string().required('Username is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const { login, error, loading, setUserRole } = useAuth(); // ✅ Context usage

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const userData = await login(data); // ✅ Call backend login
      if (userData?.user?.role) {
        setUserRole(userData.user.role);
        toast.success('Login successful!');
        Swal.fire({
          icon: 'success',
          title: 'Welcome!',
          text: 'You have successfully logged in.',
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('/');
      } else {
        throw new Error('Login failed: Role missing');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-gradient">
      <ToastContainer position="top-right" autoClose={3000} />
      <Card className="p-4 shadow-lg w-100" style={{ maxWidth: '420px' }}>
        <div className="text-center mb-4">
          {/* <img  src="/logo192.png" alt="logo" className="mb-3" style={{ width: '250px' }} /> */}
          <h3 className="fw-bold">Welcome Back</h3>
          <p className="text-muted small">Login to your account</p>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Form.Group controlId="username" className="mb-3">
            <Form.Label>Username</Form.Label>
            <InputGroup>
              <InputGroup.Text><FaUser /></InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Enter username"
                {...register('username')}
                isInvalid={!!errors.username}
                disabled={isSubmitting || loading}
              />
              <Form.Control.Feedback type="invalid">
                {errors.username?.message}
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Form.Group controlId="password" className="mb-4">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <InputGroup.Text><FaLock /></InputGroup.Text>
              <Form.Control
                type="password"
                placeholder="Enter password"
                {...register('password')}
                isInvalid={!!errors.password}
                disabled={isSubmitting || loading}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className={classNames('w-100', { disabled: isSubmitting || loading })}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? 'Logging in...' : 'Log In'}
          </Button>
        </Form>

        <div className="mt-3 d-flex justify-content-between">
          <Link to="/forgot-password" className="small text-decoration-none">Forgot password?</Link>
          <Link to="/register" className="small text-decoration-none">Register</Link>
        </div>
      </Card>
    </div>
  );
}
