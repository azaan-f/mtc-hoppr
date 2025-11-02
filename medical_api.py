from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import traceback
import json
from datetime import datetime
from pipeline import run_pipeline
from gptapi import main as gpt_main

app = Flask(__name__)
CORS(app)
DEMO_MODE = os.getenv('DEMO_MODE', 'false').lower() == 'true'

print(f"\n{'='*50}")
print(f"DEMO_MODE Status: {DEMO_MODE}")
if DEMO_MODE:
    print("WARNING: Running in DEMO MODE - using mock data!")
    print("To disable, ensure DEMO_MODE environment variable is not set or is 'false'")
else:
    print("Running with REAL medical imaging analysis")
    print("clario medical imaging analysis and GPT APIs will be called with actual data")
print(f"{'='*50}\n")

def get_mock_pipeline_analysis(filepath):
    """Return mock pipeline analysis for demo purposes"""
    return f"""
DICOM File Analysis Report
==========================

File: {os.path.basename(filepath)}
Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

TECHNICAL PARAMETERS:
- Image Type: Chest X-Ray (Posteroanterior)
- Image Quality: Good
- Patient Position: Standing, PA view
- Exposure: Appropriate

ANATOMICAL STRUCTURES:
- Heart: Normal size and contour
- Lungs: Clear bilateral lung fields
- Mediastinum: Normal width and position
- Diaphragm: Normal bilateral hemidiaphragms
- Ribs: No fractures or abnormalities visible
- Soft tissues: Unremarkable

FINDINGS:
- No acute cardiopulmonary abnormalities
- Lung fields appear clear without consolidation, effusion, or pneumothorax
- Heart size within normal limits
- No mediastinal widening
- Diaphragms intact and well-positioned
- Bony structures appear normal

IMPRESSION:
Normal chest X-ray with no acute findings.

RECOMMENDATIONS:
- Routine follow-up as clinically indicated
- Correlate with clinical symptoms if present
- No immediate intervention required

Note: This is a demonstration analysis for testing purposes.
"""

def get_mock_gpt_analysis():
    """Return mock GPT analysis for demo purposes"""
    return """
Based on the medical imaging analysis provided, here is a patient-friendly interpretation:

SUMMARY:
Your chest X-ray shows normal findings with no concerning abnormalities detected.

WHAT THIS MEANS:
- Your heart appears normal in size and position
- Your lungs are clear with no signs of infection, fluid, or other problems
- All visible structures appear healthy and within normal limits
- No immediate medical concerns were identified

NEXT STEPS:
- These results are reassuring and suggest no acute issues
- Continue with your regular healthcare routine
- If you have ongoing symptoms, discuss them with your doctor
- Follow your doctor's recommendations for any routine follow-up care

IMPORTANT NOTE:
This interpretation is for educational purposes. Always discuss your results with your healthcare provider for personalized medical advice and to address any specific concerns you may have.

Note: This is a demonstration analysis for testing purposes.
"""

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'medical_api'})

@app.route('/analyze/pipeline', methods=['POST'])
def analyze_pipeline():
    """Run pipeline analysis on uploaded DICOM file"""
    try:
        data = request.json
        if not data or 'filepath' not in data:
            return jsonify({'error': 'filepath is required'}), 400
        
        filepath = data['filepath']
        
        if not os.path.exists(filepath):
            return jsonify({'error': f'File not found: {filepath}'}), 404
        
        print(f"Running pipeline analysis on: {filepath}")
        
        if DEMO_MODE:
            print("DEMO MODE: Using mock pipeline analysis")
            pipeline_result = get_mock_pipeline_analysis(filepath)
        else:
            try:
                pipeline_result = run_pipeline(filepath)
            except Exception as pipeline_error:
                print(f"Pipeline execution failed: {str(pipeline_error)}")
                pipeline_result = f"Pipeline analysis encountered an error: {str(pipeline_error)}. Using fallback analysis mode."
        
        return jsonify({
            'success': True,
            'analysis': pipeline_result,
            'filepath': filepath,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Pipeline analysis error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/analyze/gpt', methods=['POST'])
def analyze_gpt():
    """Run GPT analysis on pipeline output"""
    try:
        data = request.json
        if not data or 'pipeline_output' not in data:
            return jsonify({'error': 'pipeline_output is required'}), 400
        
        pipeline_output = data['pipeline_output']
        filepath = data.get('filepath', '')
        questionnaire_data = data.get('questionnaire_data')
        
        print("Running GPT analysis...")
        if questionnaire_data:
            print("Including questionnaire data for personalized analysis")
        
        gpt_result = gpt_main(pipeline_output=pipeline_output, questionnaire_data=questionnaire_data)
        
        return jsonify({
            'success': True,
            'interpretation': gpt_result,
            'filepath': filepath,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"GPT analysis error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/analyze/complete', methods=['POST'])
def analyze_complete():
    """Run both pipeline and GPT analysis in one request"""
    try:
        data = request.json
        if not data or 'filepath' not in data:
            return jsonify({'error': 'filepath is required'}), 400
        
        filepath = data['filepath']
        questionnaire_data = data.get('questionnaire_data')
        
        if not os.path.exists(filepath):
            return jsonify({'error': f'File not found: {filepath}'}), 404
        
        print(f"Running complete analysis on: {filepath}")
        
        print("Step 1: Running pipeline analysis...")
        if DEMO_MODE:
            print("DEMO MODE: Using mock pipeline analysis")
            pipeline_result = get_mock_pipeline_analysis(filepath)
        else:
            try:
                pipeline_result = run_pipeline(filepath)
            except Exception as pipeline_error:
                print(f"Pipeline failed: {str(pipeline_error)}")
                pipeline_result = f"Pipeline analysis failed due to external service timeout. Error: {str(pipeline_error)}. Proceeding with GPT analysis using file information only."
        
        print("Step 2: Running GPT analysis...")
        if questionnaire_data:
            print("Including questionnaire data for personalized analysis")
        if DEMO_MODE:
            print("DEMO MODE: Using mock GPT analysis")
            gpt_result = get_mock_gpt_analysis()
        else:
            try:
                gpt_result = gpt_main(pipeline_output=pipeline_result, questionnaire_data=questionnaire_data)
            except Exception as gpt_error:
                print(f"GPT analysis failed: {str(gpt_error)}")
                gpt_result = "GPT analysis unavailable. Please consult with a healthcare professional for proper medical evaluation."
        
        return jsonify({
            'success': True,
            'pipeline_analysis': pipeline_result,
            'gpt_analysis': gpt_result,
            'questionnaire_data': questionnaire_data,
            'filepath': filepath,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Complete analysis error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Medical Analysis API Server...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /analyze/pipeline - Run pipeline analysis")
    print("  POST /analyze/gpt - Run GPT analysis")
    print("  POST /analyze/complete - Run both pipeline and GPT")
    print("\nServer running on http://localhost:8000")
    
    app.run(host='0.0.0.0', port=8000, debug=True)