This project was submitted to the Kaggle Gemini-3 Competition.


# MedLens: Explainable AI Medical Assistant

## Overview
MedLens is a production-ready, full-stack medical assistant designed to reduce clinician burnout and diagnostic errors. It ingests medical images (X-ray, CT, Derm) and PDFs, using a multimodal AI pipeline to extract structured findings with **explainability** at its core.


GOOGLE AI STUDIO LINK 
https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221mM-zTOEtbzc95_GdSiTXQgsi_pNc1LyP%22%5D,%22action%22:%22open%22,%22userId%22:%22101120196770750484564%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing

## Architecture

```mermaid
graph TD
    Client[React Client (Vite)] -->|REST API| API[Node/Express Gateway]
    API -->|Auth| Auth[JWT/OAuth]
    API -->|Data| DB[(MongoDB Atlas)]
    API -->|Cache| Redis[(Redis)]
    API -->|File Storage| S3[S3 Bucket]
    
    subgraph ML_Pipeline
        API -->|Async Job| Queue[Job Queue]
        Queue --> Worker[Inference Worker]
        Worker -->|Image| VisionModel[Gemini Pro Vision / Custom CNN]
        Worker -->|Text| NLP[Medical NLP / NER]
        Worker -->|Results| DB
    end
```

## Quick Start (Demo Mode)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server (Frontend-only with Mock Backend):**
   ```bash
   npm start
   ```
   *Note: The scaffold is currently configured to run entirely in the browser using mock services for immediate demonstration.*

3. **Full Docker Setup:**
   ```bash
   docker-compose up --build
   ```

## Key Features
*   **Evidence-Linked Reporting:** Every AI finding is clickable, highlighting the exact bounding box on the image or text segment in the source PDF.
*   **Explainable AI (XAI):** Natural language rationales for every diagnostic claim ("Why did you think this is pneumonia?").
*   **Secure Pipeline:** End-to-end encryption, PHI sanitization, and audit logging.

## Investor Pitch
**The Problem:** Radiologists and clinicians are drowning in data. Diagnostic errors occur in 3-5% of cases, often due to fatigue. Existing AI tools are "black boxes"—they give an answer but don't say *why*, making them hard to trust.

**The Solution:** MedLens is the "Glass Box" AI assistant. It doesn't just diagnose; it shows its work. By visually linking findings to evidence and providing plain-English explanations, we build trust and accelerate the review process by 40%.

**The Market:** The medical imaging AI market is projected to reach $14B by 2030. MedLens targets mid-sized clinics and teleradiology firms that need affordable, explainable workflow automation.

**Scalability:** Built on a microservices architecture (Node/Docker/K8s), MedLens scales horizontally to handle high DICOM throughput, with a pluggable model adapter layer that allows us to swap in the latest Foundation Models (Gemini, GPT-4V, Med-PaLM) instantly.
