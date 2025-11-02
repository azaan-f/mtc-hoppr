# test_medical_api.py
import requests
import json
import os

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get('http://localhost:8000/health')
        print(f"Health endpoint status: {response.status_code}")
        print(f"Health response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return False

def test_pipeline_endpoint():
    """Test the pipeline analysis endpoint"""
    try:
        # Use the existing test file
        test_file = "Atelectasis/train/0b1b897b1e1e170f1b5fd7aeff553afa.dcm"
        if not os.path.exists(test_file):
            print(f"Test file not found: {test_file}")
            return False
        
        payload = {"filepath": test_file}
        response = requests.post('http://localhost:8000/analyze/pipeline', 
                               json=payload,
                               headers={'Content-Type': 'application/json'})
        
        print(f"Pipeline endpoint status: {response.status_code}")
        result = response.json()
        
        if result.get('success'):
            print("Pipeline analysis successful!")
            print(f"Analysis length: {len(result.get('analysis', ''))}")
            return True
        else:
            print(f"Pipeline analysis failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"Pipeline endpoint error: {e}")
        return False

def test_complete_endpoint():
    """Test the complete analysis endpoint"""
    try:
        test_file = "Atelectasis/train/0b1b897b1e1e170f1b5fd7aeff553afa.dcm"
        if not os.path.exists(test_file):
            print(f"Test file not found: {test_file}")
            return False
        
        payload = {
            "filepath": test_file,
            "questionnaire_data": {"test": "data"}
        }
        response = requests.post('http://localhost:8000/analyze/complete', 
                               json=payload,
                               headers={'Content-Type': 'application/json'})
        
        print(f"Complete endpoint status: {response.status_code}")
        result = response.json()
        
        if result.get('success'):
            print("Complete analysis successful!")
            print(f"Pipeline analysis length: {len(result.get('pipeline_analysis', ''))}")
            print(f"GPT analysis length: {len(result.get('gpt_analysis', ''))}")
            return True
        else:
            print(f"Complete analysis failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"Complete endpoint error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Medical API endpoints...")
    print("=" * 50)
    
    # Test health endpoint
    print("1. Testing Health Endpoint...")
    health_ok = test_health_endpoint()
    print()
    
    # Test pipeline endpoint
    print("2. Testing Pipeline Endpoint...")
    pipeline_ok = test_pipeline_endpoint()
    print()
    
    # Test complete endpoint
    print("3. Testing Complete Analysis Endpoint...")
    complete_ok = test_complete_endpoint()
    print()
    
    # Summary
    print("=" * 50)
    print("TEST RESULTS:")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Pipeline endpoint: {'✓' if pipeline_ok else '✗'}")
    print(f"Complete endpoint: {'✓' if complete_ok else '✗'}")
    
    if all([health_ok, pipeline_ok, complete_ok]):
        print("\n🎉 All tests passed! API is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")