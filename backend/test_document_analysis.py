"""
Test script for document analysis tools

This script demonstrates the document analysis capabilities for medical documents like 
prescriptions, lab reports, and diet plans. It shows how to use the analyze_medical_document
and get_dietary_recommendations tools.

Usage:
    python backend/test_document_analysis.py
"""
import os
import sys
import base64
import asyncio
import json

# Add project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import direct versions of functions for testing
from backend.agent.tools.document_analysis_direct import (
    analyze_document_direct,
    get_dietary_recommendations_direct
)

async def test_document_analysis():
    """Test document analysis tools with a sample image"""
    print("\n===== DOCUMENT ANALYSIS TOOLS TEST =====\n")
    
    # Check if test image exists
    #test_image_path = os.path.join(os.path.dirname(__file__), "test_image.jpg")
    test_image_path = os.path.join(os.path.dirname(__file__), "/Users/ganish.n_int/Desktop/fev-doctor-prescription.jpeg")
    if not os.path.exists(test_image_path):
        print(f"Error: Test image not found at '{test_image_path}'")
        print("Please add a test image with filename 'test_image.jpg' to run this demo.")
        return
    
    # Load the test image as base64
    with open(test_image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    print("1. Testing analyze_medical_document tool for prescription analysis...")
    
    # Use the direct function without tool wrapper
    prescription_result = await analyze_document_direct(
        image_data=image_data, 
        doc_type="prescription"
    )
    
    # Pretty print the result
    print("\nPrescription Analysis Result:")
    if "data" in prescription_result:
        pretty_result = json.dumps(prescription_result["data"], indent=2)
        # Print first 500 chars to avoid flooding the console
        print(pretty_result[:500] + ("..." if len(pretty_result) > 500 else ""))
    else:
        print("Error:", prescription_result.get("error", "Unknown error"))
    
    print("\n2. Testing get_dietary_recommendations tool...")
    
    # Test dietary recommendations
    diet_result = await get_dietary_recommendations_direct(
        medical_condition="Type 2 diabetes", 
        restrictions=["lactose intolerance", "no red meat"]
    )
    
    # Pretty print the result
    print("\nDietary Recommendations Result:")
    if "data" in diet_result:
        pretty_result = json.dumps(diet_result["data"], indent=2)
        # Print first 500 chars to avoid flooding the console
        print(pretty_result[:500] + ("..." if len(pretty_result) > 500 else ""))
    else:
        print("Error:", diet_result.get("error", "Unknown error"))
    
    print("\n===== TEST COMPLETE =====\n")

if __name__ == "__main__":
    asyncio.run(test_document_analysis())
