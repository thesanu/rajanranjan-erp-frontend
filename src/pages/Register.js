import { Loader2 } from "lucide-react";
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";



export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyProfileId, setCompanyProfileId] = useState("");
  const [role, setRole] = useState("User");
  const navigate = useNavigate();
  const { register: registerUser, error, loading } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password || !fullName) return;

    try {
      await registerUser({ username, password, fullName, role, companyProfileId });
      navigate("/login");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-700 p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl grid md:grid-cols-2 gap-6"
      >
        {/* Left Card */}
        <Card className="rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 flex flex-col justify-center">
            <div className="text-center mb-6">
              <img
                // src="https://tecdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/lotus.webp"
                alt="logo"
                className="mx-auto mb-4 w-24"
              />
              <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
              <p className="text-sm text-gray-500">Register a new account</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="w-full border rounded-md p-2"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {role !== "GlobalAdmin" && (
                <div>
                  <label htmlFor="companyProfileId" className="block text-sm font-medium text-gray-700">
                    Company Profile ID
                  </label>
                  <Input
                    id="companyProfileId"
                    type="text"
                    value={companyProfileId}
                    onChange={(e) => setCompanyProfileId(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm font-medium text-center">{error}</div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Registering..." : "Register"}
              </Button>

              <div className="flex justify-center items-center text-sm mt-2">
                <Link to="/login" className="text-blue-600 hover:underline">
                  Already have an account? Login
                </Link>
              </div>
            </form>
          </div>
        </Card>

        {/* Right Side Info */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col justify-center bg-gradient-to-br from-green-500 via-teal-600 to-blue-700 text-white rounded-2xl shadow-2xl p-8"
        >
          <h3 className="text-2xl font-semibold mb-3">Join Our Platform</h3>
          <p className="text-sm leading-relaxed">
            Create an account to start managing your ERP seamlessly. Role-based access ensures security, and company-based access ensures clarity.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
