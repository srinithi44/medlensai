import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { analyzeMedicalImage, getApiKey } from '../services/modelAdapter';
import { Patient, ReportStatus, Report } from '../types';

const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali", "Marathi", "Gujarati", "Punjabi"
];

export const UploadReport: React.FC = () => {
  const { patients, addReport, user } = useStore();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [isDragging, setIsDragging] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if API Key is configured
    const key = getApiKey();
    setHasApiKey(!!key);
  }, []);

  const processFile = (f: File) => {
    setError(null);
    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(f.type)) {
      setError("Invalid file type. Please upload JPG, PNG, or PDF.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) { // 50MB
      setError("File is too large. Max size is 50MB.");
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedPatientId || !user) return;

    setIsProcessing(true);
    setError(null);

    try {
        const patient = patients.find(p => p.id === selectedPatientId)!;
        const reportFile = {
            id: `file-${Date.now()}`,
            url: preview!,
            type: file.type as any,
            name: file.name
        };

        // Real API Call with Language Preference
        const analysis = await analyzeMedicalImage(reportFile, selectedLanguage);
        
        const newReport: Report = {
            id: `rep-${Date.now()}`,
            patientId: patient.id,
            patientName: patient.name,
            createdAt: new Date().toISOString(),
            status: ReportStatus.REVIEW_REQUIRED,
            files: [reportFile],
            findings: analysis.findings,
            summary: analysis.summary,
            language: selectedLanguage, // Persist language
            
            // Multi-mode data (Display)
            summaryPatient: analysis.summaryPatient,
            summaryStudent: analysis.summaryStudent,
            summaryDoctor: analysis.summaryDoctor,
            recommendationsPatient: analysis.recommendationsPatient,
            recommendationsStudent: analysis.recommendationsStudent,
            recommendationsDoctor: analysis.recommendationsDoctor,

            // Multi-mode data (English / PDF)
            summaryPatientEn: analysis.summaryPatientEn,
            summaryStudentEn: analysis.summaryStudentEn,
            summaryDoctorEn: analysis.summaryDoctorEn,
            recommendationsPatientEn: analysis.recommendationsPatientEn,
            recommendationsStudentEn: analysis.recommendationsStudentEn,
            recommendationsDoctorEn: analysis.recommendationsDoctorEn
        };

        addReport(newReport);
        navigate(`/report/${newReport.id}`);

    } catch (err: any) {
        console.error("Processing failed", err);
        setError(err.message || "An unexpected error occurred. Please try again.");
        setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Create New Report</h2>
        <p className="text-slate-500 mb-8">Upload medical imaging or documents for AI-assisted analysis.</p>

        {/* Missing API Key Warning */}
        {!hasApiKey && (
            <div className="mb-8 bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <h3 className="text-amber-800 font-bold">API Key Missing</h3>
                    <p className="text-amber-700 text-sm mt-1">
                        You have not configured an API Key yet. The system will run in <b>Demo Mode</b> and provide simulated results.
                    </p>
                    <Link to="/admin" className="inline-block mt-2 text-sm font-semibold text-amber-800 underline hover:text-amber-900">
                        Configure API Key in Admin Panel &rarr;
                    </Link>
                </div>
            </div>
        )}

        {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-fadeIn">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="flex-1">
                    <p className="font-bold">Analysis Failed</p>
                    <p className="text-sm">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
        
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                <p className="text-slate-800 font-medium text-lg">Analyzing document with MedLens AI...</p>
                <p className="text-sm text-slate-500">Generating report in {selectedLanguage} (with English backup)...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Patient</label>
                <select
                  required
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring focus:ring-primary/20 p-2.5 bg-white border"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (MRN: {p.mrn})</option>
                  ))}
                </select>
              </div>

              {/* Language Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Report Language</label>
                <select
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring focus:ring-primary/20 p-2.5 bg-white border"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Medical Document</label>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'}
                  ${file ? 'border-success bg-success/5' : ''}
                `}
              >
                 <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange} 
                 />
                 
                 {preview ? (
                     <div className="relative inline-flex flex-col items-center">
                         <img src={preview} alt="Preview" className="h-48 object-contain rounded-lg shadow-sm bg-white mb-4" />
                         <div className="flex items-center gap-2">
                             <span className="text-sm font-medium text-slate-700">{file?.name}</span>
                             <span className="text-xs text-slate-400">({(file!.size / 1024 / 1024).toFixed(2)} MB)</span>
                         </div>
                         <button 
                            type="button"
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="mt-3 text-xs text-red-500 hover:text-red-700 font-semibold underline"
                         >
                            Remove & Upload Different File
                         </button>
                     </div>
                 ) : (
                     <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center py-6">
                         <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                         </div>
                         <p className="text-lg text-slate-700 font-medium">Drag & Drop or <span className="text-primary hover:underline">Click to Browse</span></p>
                         <p className="text-sm text-slate-400 mt-2">Supports DICOM, JPG, PNG, PDF (Max 50MB)</p>
                     </label>
                 )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!file || !selectedPatientId}
                className="bg-primary hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Analyze Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};