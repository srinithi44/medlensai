import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { AuditLog } from '../types';

export const Admin: React.FC = () => {
  const { auditLogs } = useStore();
  const [activeTab, setActiveTab] = useState<'system' | 'logs' | 'config'>('system');

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    // Load existing key from localStorage on mount
    const savedKey = localStorage.getItem('MEDLENS_API_KEY');
    if (savedKey) {
        setApiKey(savedKey);
        setHasExistingKey(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
        localStorage.removeItem('MEDLENS_API_KEY');
        setHasExistingKey(false);
    } else {
        localStorage.setItem('MEDLENS_API_KEY', apiKey.trim());
        setHasExistingKey(true);
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const tabs = [
    { id: 'system', label: 'System Status' },
    { id: 'logs', label: 'Audit Logs' },
    { id: 'config', label: 'Configuration' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Administration</h2>
        <p className="text-slate-500 mt-1">System monitoring and configuration.</p>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {/* SYSTEM STATUS TAB */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatusCard title="API Health" status="Operational" color="bg-green-100 text-green-700" />
            <StatusCard title="Model Latency" value="245ms" color="bg-blue-100 text-blue-700" />
            <StatusCard title="Daily Reports" value="12" color="bg-purple-100 text-purple-700" />
            <StatusCard title="Error Rate" value="0.01%" color="bg-slate-100 text-slate-700" />

            <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
                <h3 className="font-bold text-slate-800 mb-4">Storage Usage (S3)</h3>
                <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
                    <div className="bg-primary h-4 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>350 GB Used</span>
                    <span>1 TB Total</span>
                </div>
            </div>

            <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
                <h3 className="font-bold text-slate-800 mb-4">Model Quota (Gemini 2.5)</h3>
                <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
                    <div className="bg-warning h-4 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                    <span>62,000 Tokens Used</span>
                    <span>100,000 Limit</span>
                </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{log.userName}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{log.action}</td>
                    <td className="px-6 py-3 text-sm text-slate-500 font-mono">{log.target}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                        log.status === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-6">Model Configuration</h3>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confidence Threshold</label>
                    <div className="flex items-center gap-4">
                        <input type="range" min="0" max="100" defaultValue="75" className="w-full accent-primary" />
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">0.75</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Findings below this score will be flagged for review.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Active Model</label>
                    <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white">
                        <option>Gemini 2.5 Flash (Production)</option>
                        <option>Gemini Pro Vision (Legacy)</option>
                        <option>MedLens Local v4.1 (On-Prem)</option>
                    </select>
                </div>

                <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">API Key Management</label>
                        {hasExistingKey && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                Active Key Found
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                        Enter your Google Gemini API Key below. It will be stored securely in your browser's local storage for this session.
                    </p>
                    <div className="flex gap-2">
                        <input 
                            type={showKey ? "text" : "password"} 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter Gemini API Key (AIza...)"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-primary/50 outline-none" 
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className="px-3 py-2 text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50"
                            title={showKey ? "Hide" : "Show"}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {showKey ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                )}
                                {!showKey && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                            </svg>
                        </button>
                    </div>
                    {keySaved && <p className="text-sm text-green-600 mt-2 font-medium">✓ Key updated successfully!</p>}
                    {!hasExistingKey && !keySaved && (
                        <p className="text-xs text-amber-600 mt-2">⚠️ No API Key found. Real AI analysis will be disabled.</p>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSaveKey}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-sky-600 font-medium shadow-sm transition-all"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusCard: React.FC<{title: string, value?: string, status?: string, color: string}> = ({ title, value, status, color }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-center gap-2">
            {value && <span className="text-2xl font-bold text-slate-900">{value}</span>}
            {status && <span className={`px-2 py-0.5 rounded text-sm font-bold ${color}`}>{status}</span>}
        </div>
    </div>
);