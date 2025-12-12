import { GoogleGenAI } from "@google/genai";
import { Finding, Evidence, ReportFile } from '../types';

/**
 * MedLens ML Adapter
 * 
 * Handles interaction with Google Gemini 2.5 Flash for multimodal medical analysis.
 */

const SYSTEM_INSTRUCTION = `
You are MedLens AI — a medical explainability system. You DO NOT diagnose. 
Your job is to analyze medical images and documents and explain them at three different understanding levels.

OUTPUT INSTRUCTIONS:
1. Return ONLY valid JSON.
2. If the user specifies a Target Language (e.g., Tamil, Hindi), you MUST:
   a) Provide translated versions in "summary_patient", "summary_student", "summary_doctor", etc.
   b) Provide ENGLISH versions in "summary_patient_en", "summary_student_en", "summary_doctor_en", etc.
3. Keep technical JSON keys (like "highlights", "regions_of_interest") in English.
4. Keep the "file_type" value in English (e.g., "xray", "prescription").

---------------------------------------------
EXPLANATION MODES
---------------------------------------------

1. "patient" mode: Simple, friendly, everyday language.
2. "student" mode: Moderate detail, educational.
3. "doctor" mode: Technical descriptors.

---------------------------------------------
OUTPUT FORMAT (MANDATORY JSON)
---------------------------------------------

{
  "file_type": "xray | mri | prescription | lab_report | other",
  
  "summary_patient": "Translated...",
  "summary_student": "Translated...",
  "summary_doctor": "Translated...",
  
  "summary_patient_en": "English...",
  "summary_student_en": "English...",
  "summary_doctor_en": "English...",

  "highlights": {
    "regions_of_interest": [
      {"label": "...", "description": "...", "confidence": 0.9, "box_2d": [ymin, xmin, ymax, xmax]}
    ],
    "artifacts": []
  },
  
  "recommendations_patient": ["Translated..."],
  "recommendations_student": ["Translated..."],
  "recommendations_doctor": ["Translated..."],
  
  "recommendations_patient_en": ["English..."],
  "recommendations_student_en": ["English..."],
  "recommendations_doctor_en": ["English..."],

  "confidence_overall": 0.0,
  "disclaimer": "NOT MEDICAL ADVICE"
}

---------------------------------------------
REQUIREMENTS
---------------------------------------------
- NEVER diagnose. NEVER give treatment instructions.
- If the image is unclear or not a medical image, set "confidence_overall" to 0.1 and state the issue in summaries.
`;

// Simulate network delay for fallback
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface AnalysisResult {
  summary: string;
  findings: Finding[];
  summaryPatient: string;
  summaryStudent: string;
  summaryDoctor: string;
  summaryPatientEn: string;
  summaryStudentEn: string;
  summaryDoctorEn: string;
  recommendationsPatient: string[];
  recommendationsStudent: string[];
  recommendationsDoctor: string[];
  recommendationsPatientEn: string[];
  recommendationsStudentEn: string[];
  recommendationsDoctorEn: string[];
}

// Robust API Key Retrieval
export const getApiKey = (): string => {
    // 1. Try LocalStorage (User entered via Admin Panel) - Highest Priority for Netlify
    const localKey = localStorage.getItem('MEDLENS_API_KEY');
    if (localKey && localKey.trim().length > 0) {
        return localKey.trim();
    }

    // 2. Try Runtime Injection (window.MEDLENS_API_KEY)
    if ((window as any).MEDLENS_API_KEY) {
        return (window as any).MEDLENS_API_KEY;
    }

    // 3. Try Environment Variable (Build time)
    // We wrap this in a try-catch because referencing process in some browser environments can throw
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {
        // ignore reference errors
    }

    return '';
};

export const analyzeMedicalImage = async (file: ReportFile, language: string = 'English'): Promise<AnalysisResult> => {
  console.log(`[MedLens ML] Analyzing file: ${file.name} in ${language}`);

  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn("[MedLens] No valid API_KEY found. Using simulation.");
    return simulateAnalysis(file, language);
  }

  try {
    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // 3. Prepare Image Data
    const base64Data = file.url.split(',')[1];
    const mimeType = file.url.split(';')[0].split(':')[1] || 'image/jpeg';

    // 4. Call Model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
      contents: {
        parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: `Analyze this medical file. Target Language: ${language}. Ensure summaries and recommendations are in ${language}, and also provide English versions.` }
        ]
      }
    });

    // 5. Parse Response
    const text = response.text;
    if (!text) throw new Error("The AI model returned an empty response. Please try again.");
    
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error", text);
        throw new Error("Failed to parse the medical report. The AI response was malformed.");
    }

    if (data.confidence_overall < 0.2) {
        // Soft error: return data but user should be warned by low confidence
        console.warn("Low confidence analysis");
    }

    return mapModelResponseToApp(data, file.id);

  } catch (error: any) {
    console.error("[MedLens] AI Analysis Failed:", error);
    
    // enhance error message
    let errorMessage = "An unexpected error occurred during analysis.";
    if (error.message.includes("API key not valid") || error.message.includes("API_KEY")) {
        errorMessage = "Invalid API Key. Please update it in the Admin Configuration.";
    } else if (error.message.includes("fetch")) {
        errorMessage = "Network Error: Could not connect to Google AI services.";
    } else if (error.message.includes("400")) {
        errorMessage = "The image format is not supported or corrupted.";
    } else if (error.message.includes("503")) {
        errorMessage = "The AI service is currently overloaded. Please try again in a moment.";
    } else {
        errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

// Helper to map Gemini JSON to App Types
const mapModelResponseToApp = (data: any, fileId: string): AnalysisResult => {
  const findings: Finding[] = [];

  // Helper to map specific highlight lists to findings
  const processHighlights = (items: any[], category: 'Finding' | 'Impression') => {
    if (!items) return;
    items.forEach((item: any, index: number) => {
        findings.push({
            id: `find-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: category,
            text: `${item.label}: ${item.description}`, // Usually stays English unless label is translated
            confidence: item.confidence || 0.8,
            explanation: data.summary_student || "Visual pattern detected.",
            explanationEn: data.summary_student_en || "Visual pattern detected.", // Fallback English context
            suggestedActions: data.recommendations_student || [],
            icdCodes: [],
            evidence: item.box_2d ? [{
                fileId: fileId,
                confidence: item.confidence || 0.8,
                source: 'MODEL_VISION' as const,
                bbox: {
                    y: item.box_2d[0],
                    x: item.box_2d[1],
                    height: item.box_2d[2] - item.box_2d[0],
                    width: item.box_2d[3] - item.box_2d[1]
                }
            }] : []
        });
    });
  };

  // Map "regions_of_interest" to Findings
  processHighlights(data.highlights?.regions_of_interest, 'Finding');
  
  // Map "artifacts" to Findings (marked as visual observations)
  processHighlights(data.highlights?.artifacts, 'Finding');

  // Add a general finding for the File Type
  findings.unshift({
      id: `ft-${Date.now()}`,
      category: 'Impression',
      text: `File Classification: ${data.file_type?.replace('_', ' ').toUpperCase()}`,
      confidence: data.confidence_overall || 0.9,
      explanation: "Classified based on visual features.",
      explanationEn: "Classified based on visual features.",
      suggestedActions: [],
      evidence: []
  });

  return {
    summary: data.summary_patient || "Analysis complete.", 
    findings,
    // Translated
    summaryPatient: data.summary_patient || "",
    summaryStudent: data.summary_student || "",
    summaryDoctor: data.summary_doctor || "",
    recommendationsPatient: data.recommendations_patient || [],
    recommendationsStudent: data.recommendations_student || [],
    recommendationsDoctor: data.recommendations_doctor || [],
    // English Fallbacks (Use translated if english not provided)
    summaryPatientEn: data.summary_patient_en || data.summary_patient || "",
    summaryStudentEn: data.summary_student_en || data.summary_student || "",
    summaryDoctorEn: data.summary_doctor_en || data.summary_doctor || "",
    recommendationsPatientEn: data.recommendations_patient_en || data.recommendations_patient || [],
    recommendationsStudentEn: data.recommendations_student_en || data.recommendations_student || [],
    recommendationsDoctorEn: data.recommendations_doctor_en || data.recommendations_doctor || [],
  };
};

// --- MOCK SIMULATION (Fallback) ---
const simulateAnalysis = async (file: ReportFile, language: string): Promise<AnalysisResult> => {
  await delay(1500); 
  
  // Explicit Instruction Message
  const fallbackMsg = "⚠️ DEMO MODE: REAL AI IS DISABLED.";
  const instructionMsg = "To enable Real AI Analysis: Go to Admin Panel > Configuration > API Key Management and enter your Gemini API Key.";
  
  const mockData = {
      file_type: "demo_simulation",
      summary_patient: fallbackMsg,
      summary_student: instructionMsg,
      summary_doctor: "MISSING_API_KEY: The application is running in Simulation Mode because no API Key was found in LocalStorage or Environment Variables.",
      
      summary_patient_en: fallbackMsg,
      summary_student_en: instructionMsg,
      summary_doctor_en: "MISSING_API_KEY: The application is running in Simulation Mode because no API Key was found in LocalStorage or Environment Variables.",

      highlights: {
        regions_of_interest: [
            { label: "Configuration Error", description: "API Key Not Found", confidence: 1.0, box_2d: [10, 10, 90, 90] }
        ],
        artifacts: []
      },
      recommendations_patient: ["Go to Admin Page", "Click Configuration Tab", "Enter API Key"],
      recommendations_student: [],
      recommendations_doctor: [],

      recommendations_patient_en: ["Go to Admin Page", "Click Configuration Tab", "Enter API Key"],
      recommendations_student_en: [],
      recommendations_doctor_en: [],

      confidence_overall: 0.0,
      disclaimer: "SIMULATION ONLY"
  };

  return mapModelResponseToApp(mockData, file.id);
};

export const generateExplanation = async (findingText: string): Promise<string> => {
   await delay(1000);
   return `MedLens analyzed specific visual patterns associated with "${findingText}" to generate this finding.`;
};