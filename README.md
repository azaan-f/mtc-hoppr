# clario - AI-Powered Radiology Analysis Platform

## Hackathon Project Overview

**clario** is an intelligent medical imaging analysis platform that transforms complex radiology scans into clear, patient-friendly reports. Built for healthcare accessibility, clario uses advanced AI models to analyze chest X-rays, CT scans, and MRIs, providing instant, understandable results with actionable next steps.

### Key Features

- **Advanced AI Analysis**: Leverages Hoppr AI medical imaging models with tiered inference for comprehensive scan analysis
- **Patient-Friendly Reports**: GPT-powered explanations that translate medical jargon into plain language
- **Real-time Confidence Scoring**: Visual confidence gauges showing AI analysis reliability
- **Personalized Recommendations**: Context-aware next steps based on questionnaire data and findings
- **Professional PDF Reports**: Downloadable, formatted reports for patient records
- **Structured Findings Display**: Clear categorization of detected abnormalities and ruled-out conditions
- **Fast Processing**: Asynchronous pipeline execution with real-time progress tracking

---

## Technology Stack

### Backend
- **Python 3.8+** - Core language
- **Flask** - REST API server
- **Hoppr AI** - Medical imaging analysis models
- **OpenAI API** - GPT-powered patient-friendly explanations

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **jsPDF** - Client-side PDF generation
- **Framer Motion** - Scroll animations and transitions

---

## Prerequisites

Before running the application, ensure you have:

1. **Node.js 18+** and **npm** or **pnpm**
   ```bash
   node --version  # Should be v18 or higher
   npm --version
   ```

2. **Python 3.8+** and **pip**
   ```bash
   python --version  # Should be 3.8 or higher
   pip --version
   ```

3. **API Keys** (Optional for demo mode):
   - OpenAI API key (for GPT explanations)
   - Hoppr AI API key (can be set in `.env` file)

---

## Quick Start Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mtchacks
```

### 2. Backend Setup

> **IMPORTANT**: The Flask backend server MUST be running for the application to work. The frontend will show an error if it cannot connect to `http://localhost:8000`.

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Set Environment Variables (Optional)

Create a `.env` file in the root directory:

```bash
# Optional: Set to 'true' to use mock data instead of real API calls
DEMO_MODE=false

# Optional: OpenAI API key for GPT explanations
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Hoppr AI API key for medical imaging analysis
HOPPR_API_KEY=your_hoppr_api_key_here
```

**Note**: The application can run in **DEMO_MODE** without API keys for testing purposes.

#### Start the Flask API Server

```bash
python medical_api.py
```

> **CRITICAL**: Keep this terminal window open! The server must remain running for the frontend to work.

The server will start on `http://localhost:8000`. You should see:

```
==================================================
DEMO_MODE Status: False
Running with REAL medical imaging analysis
clario medical imaging analysis and GPT APIs will be called with actual data
==================================================

Starting Medical Analysis API Server...
Available endpoints:
  GET  /health - Health check
  POST /analyze/pipeline - Run pipeline analysis
  POST /analyze/gpt - Run GPT analysis
  POST /analyze/complete - Run both pipeline and GPT

Server running on http://localhost:8000
```

### 3. Frontend Setup

#### Navigate to Frontend Directory

```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
# OR
pnpm install
```

#### Start the Development Server

```bash
npm run dev
# OR
pnpm dev
```

The frontend will start on `http://localhost:3000`.

---

## Usage Flow

### 1. **Upload Scan**
   - Navigate to the upload page
   - Select a DICOM file (`.dcm`), PNG, or JPG image
   - PNG/JPG images are automatically converted to DICOM format
   - File is uploaded and pipeline analysis begins

### 2. **Complete Questionnaire**
   - Fill out patient information (name, DOB, gender, weight, height)
   - Provide medical history (medications, allergies, family history)
   - Report current symptoms

### 3. **View Results**
   - Wait for AI analysis to complete (1-2 minutes)
   - Review findings with:
     - **Image preview** of your uploaded scan
     - Severity indicator (normal, mild, moderate, severe, critical)
     - Confidence score visualization
     - Patient-friendly explanation
     - Key findings list
     - Detected abnormalities (>50% confidence)
     - Recommended next steps
   - Download PDF report

---

## Project Structure

```
mtchacks/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # Next.js app router pages
│   │   ├── api/             # API routes
│   │   │   ├── upload/      # File upload handler
│   │   │   ├── analyze/     # GPT analysis proxy
│   │   │   ├── status/      # Pipeline status checker
│   │   │   ├── image/       # Image preview handler
│   │   │   └── generate-pdf/ # PDF generation (legacy)
│   │   ├── intake/          # Questionnaire page
│   │   ├── results/         # Results display page
│   │   └── upload/          # File upload page
│   ├── components/          # React components
│   │   ├── ui/              # UI component library
│   │   ├── confidence-gauge.tsx
│   │   └── animate-on-scroll.tsx # Scroll animations
│   ├── lib/                 # Utility libraries
│   │   ├── analysis-parser.ts    # Parse AI outputs
│   │   ├── pdf-generator.ts      # PDF report generation
│   │   ├── questionnaire-utils.ts # Questionnaire formatting
│   │   └── utils.ts             # General utilities
│   ├── public/              # Static assets (logos, images)
│   ├── templates/           # HTML templates (PDF generation)
│   └── package.json
│
├── medical_api.py           # Flask REST API server
├── pipeline.py              # Hoppr AI pipeline orchestrator
├── gptapi.py                # OpenAI GPT integration
├── image_to_dicom.py        # Convert PNG/JPG to DICOM format
├── dicom_to_image.py        # Convert DICOM to PNG for preview
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

---

## API Endpoints

### Backend (Flask - Port 8000)

#### Health Check
```http
GET http://localhost:8000/health
```
Returns: `{"status": "healthy", "service": "medical_api"}`

#### Run Pipeline Analysis
```http
POST http://localhost:8000/analyze/pipeline
Content-Type: application/json

{
  "filepath": "/path/to/dicom/file.dcm"
}
```

#### Run GPT Analysis
```http
POST http://localhost:8000/analyze/gpt
Content-Type: application/json

{
  "pipeline_output": "Pipeline analysis text...",
  "filepath": "/path/to/file.dcm",
  "questionnaire_data": { ... }
}
```

#### Complete Analysis (Pipeline + GPT)
```http
POST http://localhost:8000/analyze/complete
Content-Type: application/json

{
  "filepath": "/path/to/dicom/file.dcm",
  "questionnaire_data": { ... }
}
```

### Frontend (Next.js - Port 3000)

#### Upload File
```http
POST http://localhost:3000/api/upload
Content-Type: multipart/form-data

file: <DICOM, PNG, or JPG file>
```

#### Check Analysis Status
```http
GET http://localhost:3000/api/status?analysisId=<analysis_id>
```

#### Get Image Preview
```http
GET http://localhost:3000/api/image?path=<file_path>
```

#### Generate PDF (Legacy endpoint)
```http
POST http://localhost:3000/api/generate-pdf
Content-Type: application/json

{ "analysisData": { ... } }
```

Note: PDF generation is primarily handled client-side using jsPDF.

---

## Demo Mode

The application supports a **DEMO_MODE** for testing without API keys:

### Enable Demo Mode

Set the environment variable:
```bash
export DEMO_MODE=true
# OR on Windows:
set DEMO_MODE=true
```

Or create a `.env` file:
```
DEMO_MODE=true
```

When enabled:
- ✅ Uses mock pipeline analysis (no Hoppr API calls)
- ✅ Uses mock GPT analysis (no OpenAI API calls)
- ✅ All features work identically to production mode
- ✅ Perfect for demonstrations and testing

**Status is displayed on server startup**:
```
DEMO_MODE Status: True
WARNING: Running in DEMO MODE - using mock data!
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | - | OpenAI API key for GPT explanations |
| `HOPPR_API_KEY` | No* | - | Hoppr AI API key (can be set in `.env` file) |

*Required only when `DEMO_MODE=false`

### Sample DICOM Files

For testing, you can use any valid DICOM file (`.dcm`), PNG, or JPG image. The application will automatically convert PNG/JPG images to DICOM format for analysis.

---

## Testing

### Manual Testing Flow

1. **Start Backend**: `python medical_api.py`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Open Browser**: Navigate to `http://localhost:3000`
4. **Upload File**: Use sample DICOM file or any medical image
5. **Complete Form**: Fill questionnaire with test data
6. **View Results**: Wait for analysis and review generated report

---

## Troubleshooting

### Backend Issues

**Frontend shows "Backend server not running" error:**
- This means the Flask API server is not running
- **Solution**: Open a terminal and run `python medical_api.py`
- Keep the terminal window open while using the application
- Verify the server is running by checking for the "Server running on http://localhost:8000" message

**Port 8000 already in use:**
```bash
# Find and kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill
```

**Python dependencies not installing:**
```bash
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

**Image conversion failing:**
- Ensure `pydicom`, `Pillow`, and `numpy` are installed
- Check that the uploaded image file is valid (PNG, JPG, or JPEG)
- Verify write permissions in the `uploads/` directory

**Hoppr AI API errors:**
- Enable DEMO_MODE for testing
- Check API key in `.env` file (`HOPPR_API_KEY` environment variable)
- Verify network connectivity

### Frontend Issues

**Port 3000 already in use:**
```bash
# Next.js will automatically use the next available port
# Or specify a different port:
npm run dev -- -p 3001
```

**TypeScript errors:**
- The project has `ignoreBuildErrors: true` configured
- These are mostly ES2018 regex flag warnings and don't affect functionality

**Dependencies not installing:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Module not found errors:**
```bash
# Clear Next.js cache
rm -rf frontend/.next
npm run dev
```

### Analysis Issues

**Pipeline analysis takes too long:**
- Normal processing time is 1-2 minutes
- Check backend console for errors
- Verify DICOM file is valid

**No results displayed:**
- Check browser console for errors
- Verify Flask server is running
- Check `temp/` directory for status files

**PDF download not working:**
- Ensure jsPDF is installed: `npm install jspdf`
- Check browser console for errors
- Try a different browser

---

## How It Works

### 1. **Pipeline Analysis** (`pipeline.py`)
   - Uploads DICOM file to Hoppr AI
   - Runs tiered model inference:
     - **Tier 1**: Critical conditions (pneumothorax, pleural effusion, etc.)
     - **Tier 2**: Secondary conditions (atelectasis, hyperinflation, etc.)
     - **Tier 3**: Additional findings (hiatus hernia, devices, etc.)
   - Generates VLM narrative in plain language
   - Formats structured output for GPT processing

### 2. **GPT Analysis** (`gptapi.py`)
   - Takes pipeline output and questionnaire data
   - Requests structured JSON response from OpenAI
   - Generates patient-friendly explanations
   - Extracts key findings, next steps, and severity

### 3. **Frontend Processing** (`frontend/lib/analysis-parser.ts`)
   - Parses raw pipeline and GPT outputs
   - Structures data for display
   - Filters findings by confidence (>50%)
   - Calculates confidence scores

### 4. **PDF Generation** (`frontend/lib/pdf-generator.ts`)
   - Creates professional PDF reports
   - Includes all key findings and recommendations
   - Uses jsPDF for client-side generation

### 5. **Image Conversion** (`image_to_dicom.py`, `dicom_to_image.py`)
   - Converts PNG/JPG images to DICOM format for Hoppr AI analysis
   - Converts DICOM files to PNG for browser preview
   - Maintains image quality and metadata during conversion

### 6. **Image Preview** (`frontend/app/api/image/route.ts`)
   - Serves uploaded images for display on results page
   - Handles both original images and DICOM-to-PNG conversions
   - Implements caching for performance

---

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       │ HTTP Requests
       │
┌──────▼─────────────────────────────────────┐
│        Next.js API Routes                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Upload  │  │  Status  │  │ Analyze │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼──────────────┼──────────────┼────────┘
        │              │              │
        │              │              │
┌───────▼──────────────▼──────────────▼────────┐
│         Flask API Server (Port 8000)        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Pipeline │  │   GPT    │  │ Complete│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼─────────┘
        │              │              │
        │              │              │
   ┌────▼────┐    ┌────▼────┐        │
   │  Hoppr  │    │  OpenAI │        │
   │   AI    │    │   API   │        │
   └─────────┘    └─────────┘        │
                                     │
                              ┌──────▼──────┐
                              │  Python     │
                              │  Scripts    │
                              └─────────────┘
```

---

### Key Features to Highlight

1. **Real-time Processing**: Watch the progress bar during analysis
2. **Personalized Reports**: See how questionnaire data affects recommendations
3. **Professional Output**: Download a formatted PDF report
4. **Confidence Visualization**: Understand AI analysis reliability
5. **Patient-Friendly Language**: Compare technical findings to plain-language explanations
6. **Image Support**: Upload PNG/JPG images - automatically converted to DICOM
7. **Image Preview**: View your scan image alongside the analysis results
8. **Smooth Animations**: Scroll-triggered animations on the home page
9. **Modern UI**: Professional design with purple theme and smooth transitions

### Performance Expectations

- **Pipeline Analysis**: 30-90 seconds (depending on API response)
- **GPT Analysis**: 10-30 seconds
- **Total Time**: 1-2 minutes per scan
- **PDF Generation**: Instant (client-side)

---

## Learning Resources

### Understanding the Code

- **`pipeline.py`**: Core medical imaging analysis logic
- **`gptapi.py`**: Natural language generation
- **`medical_api.py`**: API orchestration
- **`frontend/lib/analysis-parser.ts`**: Output parsing and structuring
- **`frontend/lib/pdf-generator.ts`**: Report generation

## Thank You!

Thank you for reviewing clario! We hope you find the platform innovative and impactful for making medical imaging analysis more accessible to patients.


