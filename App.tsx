import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UploadReport } from './pages/UploadReport';
import { ReportViewer } from './pages/ReportViewer';
import { Patients } from './pages/Patients';
import { PatientDetails } from './pages/PatientDetails';
import { Reports } from './pages/Reports';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';

// Simple Login Page Component
const LoginPage: React.FC = () => {
    const { login } = useStore();
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate login
        login({ id: 'u1', name: 'Dr. Sarah Connor', email: 'sarah@medlens.ai', role: 'CLINICIAN' } as any);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-slate-800 mb-2"><span className="text-primary">Med</span>Lens AI</h1>
                <p className="text-center text-slate-500 mb-8">Secure Clinical AI Workspace</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" defaultValue="demo@medlens.ai" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input type="password" defaultValue="password" className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors">Login to Workspace</button>
                </form>
                <p className="text-xs text-center text-slate-400 mt-6"> HIPAA Compliant • 256-bit Encryption</p>
            </div>
        </div>
    );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { isAuthenticated } = useStore();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/upload" element={<UploadReport />} />
                  <Route path="/report/:id" element={<ReportViewer />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patient/:id" element={<PatientDetails />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </HashRouter>
  );
}