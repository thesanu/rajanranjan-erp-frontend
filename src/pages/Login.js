import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Form, Button, Card, InputGroup, Spinner } from 'react-bootstrap';
import { FaUser, FaLock } from 'react-icons/fa';
import classNames from 'classnames';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // ✅ Include your auth context
import '../index.css'; // Make sure .app-bg is defined here or imported
import { CircleLoader } from 'react-spinners';

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
      const userData = await login(data);
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
      console.error(err);
      if (err.response && err.response.status === 401) {
        toast.error('Invalid credentials');
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('Something went wrong');
      }
    }
  };


  const isLoading = isSubmitting || loading;

  // Loader overlay component
  const LoaderOverlay = () => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(234, 241, 231, 0.51)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1050, // higher than Card
        borderRadius: '0.375rem', // match card border-radius
      }}
    >
      <CircleLoader
        color="rgba(23, 115, 102, 0.95)"
        loading={true}
        size={60}
        speedMultiplier={1}
      />
    </div>
  );

  return (
    <>
      {/* Background Gradient */}
      <div className="app-bg" />

      {/* Main Login Container */}
      <div className="d-flex justify-content-center align-items-center vh-100">
        <ToastContainer position="top-right" autoClose={3000} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <Card className="p-4 shadow-lg w-100">
            {isLoading && <LoaderOverlay />}
            <div className="text-center mb-4">
              {/* <img src="/logo192.png" alt="logo" className="mb-3" style={{ width: '250px' }} /> */}
              <h3 className="fw-bold" style={{ color: 'rgba(3, 53, 46, 0.95)' }}>
                Welcome Back
              </h3>
              <p className="small" style={{ color: 'rgba(23,115,102,0.95)' }}>
                Login to your account
              </p>
            </div>

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Form.Group controlId="username" className="mb-3">
                <Form.Label className="custom-label">Username</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaUser /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Enter username"
                    {...register('username')}
                    isInvalid={!!errors.username}
                    disabled={isLoading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username?.message}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              <Form.Group controlId="password" className="mb-4">
                <Form.Label className="custom-label">Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaLock /></InputGroup.Text>
                  <Form.Control
                    type="password"
                    placeholder="Enter password"
                    {...register('password')}
                    isInvalid={!!errors.password}
                    disabled={isLoading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              <Button
                type="submit"
                className={classNames('w-100 custom-login-button', { disabled: isLoading })}
                disabled={isLoading}
              >
                {isLoading && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                )}
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>

            </Form>

            <div className="mt-3 d-flex justify-content-between">
              {/* <Link to="/forgot-password" className="small text-decoration-none">Forgot password?</Link>
              <Link to="/register" className="small text-decoration-none">Register</Link> */}
            </div>
          </Card>
        </div>
      </div>
      <style>{`
  .custom-label {
    color: rgba(23, 115, 102, 0.95);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-weight: 600;
  }

  .custom-login-button {
  background-color: rgba(23, 115, 102, 0.95);
  border-color: rgba(23, 115, 102, 0.95);
  color: #fff;
}

.custom-login-button:hover,
.custom-login-button:focus,
.custom-login-button:active {
  background-color: rgba(20, 100, 90, 0.95); /* Slightly darker on hover */
  border-color: rgba(20, 100, 90, 0.95);
}

`}</style>
    </>
  );
}
