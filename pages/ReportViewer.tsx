import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { ReportStatus, Finding } from '../types';
import { jsPDF } from 'jspdf';

// --- Stepper Component ---
const ProcessingStepper: React.FC<{ status: ReportStatus }> = ({ status }) => {
  const steps = [
    { label: 'Upload', desc: 'Secure Ingestion', state: 'completed' },
    { label: 'Processing', desc: 'OCR & NLP Extraction', state: 'completed' },
    { label: 'Review', desc: 'Clinician Verification', state: status === ReportStatus.APPROVED ? 'completed' : 'current' },
    { label: 'Approved', desc: 'Final Sign-off', state: status === ReportStatus.APPROVED ? 'completed' : 'waiting' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 py-4 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex justify-between items-center">
           {/* Progress Bar Background */}
           <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
           
           {/* Progress Bar Active (Visual Approximation) */}
           <div 
             className="absolute top-4 left-0 h-0.5 bg-green-500 -z-10 transition-all duration-500"
             style={{ width: status === ReportStatus.APPROVED ? '100%' : '66%' }}
           ></div>

           {steps.map((step, idx) => {
             const isCompleted = step.state === 'completed';
             const isCurrent = step.state === 'current';
             
             return (
              <div key={idx} className="flex flex-col items-center bg-white px-2 z-10">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                    isCompleted ? 'bg-green-500 border-green-500 text-white shadow-md' :
                    isCurrent ? 'bg-white border-primary text-primary ring-4 ring-primary/10' :
                    'bg-slate-50 border-slate-200 text-slate-300'
                 }`}>
                    {isCompleted ? (
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : isCurrent ? (
                       <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    ) : (
                       <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                 </div>
                 <span className={`text-xs font-bold uppercase tracking-wide ${isCurrent ? 'text-primary' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                   {step.label}
                 </span>
                 <span className="text-[10px] text-slate-400 font-medium hidden sm:block mt-0.5">
                   {step.desc}
                 </span>
              </div>
             );
           })}
        </div>
      </div>
    </div>
  );
};

type ExplanationMode = 'patient' | 'student' | 'doctor';

export const ReportViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reports, updateReport } = useStore();
  const report = reports.find(r => r.id === id);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  
  // Explanation Mode State
  const [mode, setMode] = useState<ExplanationMode>('patient');
  
  // Feedback State
  const [correctionText, setCorrectionText] = useState('');
  const [showCorrectionInput, setShowCorrectionInput] = useState<string | null>(null);

  if (!report) return <div className="p-8 text-center text-slate-500">Report not found. Please return to dashboard.</div>;

  const currentFile = report.files[0]; // Simplified for MVP

  // Helper to get text based on mode (UI Display)
  const getSummaryForMode = () => 
    mode === 'patient' ? (report.summaryPatient || report.summary) :
    mode === 'student' ? (report.summaryStudent || report.summary) :
    (report.summaryDoctor || report.summary);

  const getRecommendationsForMode = () =>
    mode === 'patient' ? (report.recommendationsPatient || []) :
    mode === 'student' ? (report.recommendationsStudent || []) :
    (report.recommendationsDoctor || []);

  const handleApprove = () => {
    updateReport(report.id, { status: ReportStatus.APPROVED });
    navigate('/');
  };

  const submitFeedback = (findingId: string, isAccurate: boolean, correction?: string) => {
    const updatedFindings = report.findings.map(f => {
        if (f.id === findingId) {
            return {
                ...f,
                feedback: {
                    isAccurate,
                    correction,
                    timestamp: new Date().toISOString()
                }
            };
        }
        return f;
    });

    updateReport(report.id, { findings: updatedFindings });
    setShowCorrectionInput(null);
    setCorrectionText('');
  };

  const handleExportPDF = () => {
    try {
        const doc = new jsPDF();
        
        const margin = 20;
        let y = 20;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233); // Primary Blue
        doc.text("MedLens AI", margin, y);
        y += 6;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`AI-Assisted Medical Report (Official English Record)`, margin, y);
        y += 10;
        
        // Horizontal Line
        doc.setDrawColor(200);
        doc.line(margin, y, 210 - margin, y);
        y += 10;

        // Patient Details
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Patient Name: ${report.patientName}`, margin, y);
        y += 6;
        doc.text(`Report ID: ${report.id}`, margin, y);
        y += 6;
        doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, margin, y);
        y += 6;
        doc.text(`Mode: ${mode.toUpperCase()} View`, margin, y);
        y += 12;

        // Summary (ALWAYS ENGLISH for PDF stability)
        // Use English fields if available, otherwise fallback to standard summary
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Clinical Summary", margin, y);
        y += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60);
        
        const summaryText = mode === 'patient' ? (report.summaryPatientEn || report.summary) :
                            mode === 'student' ? (report.summaryStudentEn || report.summary) :
                            (report.summaryDoctorEn || report.summary);

        // Split text to fit page width
        const splitSummary = doc.splitTextToSize(summaryText, 170);
        doc.text(splitSummary, margin, y);
        y += (splitSummary.length * 5) + 10;

        // Recommendations (ALWAYS ENGLISH)
        const recs = mode === 'patient' ? (report.recommendationsPatientEn || []) :
                     mode === 'student' ? (report.recommendationsStudentEn || []) :
                     (report.recommendationsDoctorEn || []);

        if (recs.length > 0) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Recommendations", margin, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            recs.forEach(r => {
                const splitRec = doc.splitTextToSize(`• ${r}`, 170);
                doc.text(splitRec, margin, y);
                y += (splitRec.length * 5) + 2;
            });
            y += 8;
        }

        // Findings
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Detailed Findings", margin, y);
        y += 8;

        if (report.findings && report.findings.length > 0) {
            report.findings.forEach((finding, index) => {
                if (y > 270) { doc.addPage(); y = 20; }

                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0);
                // finding.text is usually English label
                const title = `${index + 1}. ${finding.category} (${Math.round((finding.confidence || 0) * 100)}%)`;
                doc.text(title, margin, y);
                y += 5;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(50);
                
                const findingText = finding.text; 
                const splitText = doc.splitTextToSize(findingText, 170);
                doc.text(splitText, margin, y);
                y += (splitText.length * 5) + 2;

                // Use the explicit English explanation field if available
                const expl = finding.explanationEn || finding.explanation;
                if (expl) {
                    doc.setFontSize(9);
                    doc.setTextColor(80);
                    doc.setFont("helvetica", "italic");
                    const splitExpl = doc.splitTextToSize(`Context: ${expl}`, 170);
                    doc.text(splitExpl, margin, y);
                    y += (splitExpl.length * 4) + 6;
                } else {
                    y += 4;
                }
            });
        }

        doc.save(`MedLens_Report_${report.patientName.replace(/\s+/g, '_')}_English.pdf`);
    } catch (err) {
        console.error("PDF Generation Failed:", err);
        alert("Failed to generate PDF. Please try again.");
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf > 0.9) return 'bg-green-100 text-green-800';
    if (conf > 0.75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const currentSummary = getSummaryForMode();
  const currentRecommendations = getRecommendationsForMode();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-30">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {report.patientName} 
            <span className="text-slate-400 font-normal text-sm">| {new Date(report.createdAt).toLocaleDateString()}</span>
          </h1>
          <div className="flex gap-2 text-xs mt-1">
             <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">ID: {report.patientId}</span>
             <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 border border-blue-100">Language: {report.language}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export PDF (English)
          </button>
          {report.status !== ReportStatus.APPROVED && (
             <button 
                onClick={handleApprove}
                className="px-4 py-2 text-sm font-medium text-white bg-success hover:bg-emerald-600 rounded-lg shadow-sm flex items-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               Approve Report
             </button>
          )}
        </div>
      </header>
      
      {/* Lifecycle Stepper */}
      <ProcessingStepper status={report.status} />

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Image / Evidence */}
        <div className="w-1/2 bg-slate-900 border-r border-slate-700 relative flex flex-col">
          <div className="flex-1 relative">
             <EvidenceViewer 
                imageUrl={currentFile.url} 
                findings={report.findings}
                selectedFindingId={selectedFindingId}
                onSelectFinding={setSelectedFindingId}
             />
          </div>
          <div className="h-12 bg-slate-800 text-slate-400 text-xs flex items-center px-4 justify-between border-t border-slate-700">
             <span>Viewer v1.2</span>
             <span>Zoom: 100%</span>
          </div>
        </div>

        {/* Right: Findings Panel */}
        <div className="w-1/2 bg-slate-50 overflow-y-auto p-6 space-y-6">
          
          {/* View Mode Selector */}
          <div className="bg-white rounded-lg p-1.5 border border-slate-200 shadow-sm flex gap-1">
             {(['patient', 'student', 'doctor'] as const).map((m) => (
                <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                        mode === m 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                >
                    {m} View
                </button>
             ))}
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 transition-all">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    {mode === 'patient' ? 'Simplified Summary' : mode === 'student' ? 'Educational Summary' : 'Clinical Impression'}
                </h3>
             </div>
             <p className="text-slate-800 leading-relaxed font-sans">{currentSummary}</p>
             
             {currentRecommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {currentRecommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                </div>
             )}
          </div>

          {/* Findings List */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Detected Regions of Interest</h3>
            <div className="space-y-3">
              {report.findings.map((finding) => (
                <div 
                  key={finding.id}
                  onClick={() => setSelectedFindingId(finding.id === selectedFindingId ? null : finding.id)}
                  className={`bg-white rounded-lg border transition-all cursor-pointer overflow-hidden ${
                    selectedFindingId === finding.id 
                      ? 'border-primary ring-1 ring-primary shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${finding.category === 'Finding' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                         {finding.category}
                       </span>
                       <div className="flex items-center gap-2">
                           {/* Visual Indicator if finding has a bounding box */}
                           {finding.evidence.some(e => e.bbox) && (
                               <span title="Visual evidence available" className="text-slate-400">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                               </span>
                           )}
                           {finding.feedback && (
                               <span title={finding.feedback.isAccurate ? "Verified Accurate" : "Flagged as Incorrect"} className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${finding.feedback.isAccurate ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {finding.feedback.isAccurate ? '✓' : '!'}
                               </span>
                           )}
                           <span className={`text-xs font-mono px-2 py-0.5 rounded ${getConfidenceColor(finding.confidence)}`}>
                             AI: {Math.round(finding.confidence * 100)}%
                           </span>
                       </div>
                    </div>
                    <p className="font-medium text-slate-900">{finding.text}</p>
                    
                    {selectedFindingId === finding.id && (
                      <div className="mt-4 pt-4 border-t border-slate-100 text-sm space-y-3 animate-fadeIn">
                         <div>
                            <span className="font-semibold text-slate-700 block mb-1">AI Context:</span>
                            <p className="text-slate-600 bg-slate-50 p-2 rounded italic">"{finding.explanation}"</p>
                         </div>
                         
                         {/* Feedback Mechanism */}
                         <div className="mt-4 pt-3 border-t border-slate-100">
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Model Feedback</h4>
                             
                             {finding.feedback ? (
                                <div className={`text-sm p-3 rounded-lg border ${finding.feedback.isAccurate ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                    <div className="flex items-center gap-2 font-medium">
                                        {finding.feedback.isAccurate ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Verified Accurate
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Marked Inaccurate
                                            </>
                                        )}
                                    </div>
                                    {!finding.feedback.isAccurate && finding.feedback.correction && (
                                        <div className="mt-2 text-xs text-red-700 bg-red-100/50 p-2 rounded">
                                            <span className="font-semibold">Correction:</span> {finding.feedback.correction}
                                        </div>
                                    )}
                                    <div className="mt-1 text-[10px] opacity-70 text-right">
                                        Logged: {new Date(finding.feedback.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                             ) : (
                                <div>
                                    {showCorrectionInput === finding.id ? (
                                        <div className="space-y-2 animate-fadeIn">
                                            <textarea
                                                className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none"
                                                rows={3}
                                                placeholder="Describe the error or provide the correct value..."
                                                value={correctionText}
                                                onChange={(e) => setCorrectionText(e.target.value)}
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button 
                                                    onClick={() => { setShowCorrectionInput(null); setCorrectionText(''); }}
                                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => submitFeedback(finding.id, false, correctionText)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-sky-600 rounded shadow-sm"
                                                >
                                                    Submit Correction
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => submitFeedback(finding.id, true)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Accurate
                                            </button>
                                            <button 
                                                onClick={() => setShowCorrectionInput(finding.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Incorrect
                                            </button>
                                        </div>
                                    )}
                                </div>
                             )}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};