"""
Test script that simulates how the agent calls document analysis tools

This script mimics the agent's behavior when processing document analysis
to help debug integration issues.
"""
import asyncio
import json
import os
import sys
import base64
from typing import Dict, Any

# Add project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from backend.agent.agent import ChatbotAgent

async def test_document_analysis_through_agent():
    """Test document analysis through the agent pipeline"""
    print("\n===== DOCUMENT ANALYSIS AGENT TEST =====\n")

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
    
    print(f"Loaded test image, encoded size: {len(image_data)} chars")

    # Create an instance of the chatbot agent
    agent = ChatbotAgent()
    
    # Set up a test conversation
    conversation_id = "test-document-analysis-123"
    user_message = "Can you analyze this prescription for me?"
    
    print("Sending message with image to agent...")
    
    # Process message with image attachment
    image_result = {"type": "image", "data": image_data, "metadata": {"name": "prescription.jpg"}}
    
    response_chunks = []
    async for chunk in agent.process_message(
        message=user_message,
        conversation_id=conversation_id,
        media=image_result
    ):
        response_chunks.append(chunk)
        
        # Print non-message events as they come
        if chunk.get("type") != "message":
            event_type = chunk.get("type", "unknown")
            
            if event_type == "structured_data":
                data_type = chunk.get("data", {}).get("type", "unknown")
                print(f"Received structured data event of type: {data_type}")
            else:
                print(f"Received event: {event_type}")
    
    # Extract key events
    tool_events = [chunk for chunk in response_chunks if chunk.get("type") == "tool_start" or chunk.get("type") == "tool_end"]
    structured_data_events = [chunk for chunk in response_chunks if chunk.get("type") == "structured_data"]
    
    # Print summary of tool usage
    print("\n=== TOOL USAGE SUMMARY ===")
    for event in tool_events:
        if event.get("type") == "tool_start":
            print(f"Started tool: {event.get('name', 'unknown')}")
        elif event.get("type") == "tool_end":
            print(f"Completed tool: {event.get('name', 'unknown')}")
    
    # Print summary of structured data
    print("\n=== STRUCTURED DATA SUMMARY ===")
    for event in structured_data_events:
        data = event.get("data", {})
        data_type = data.get("type", "unknown")
        
        if data_type == "document_analysis_result":
            result_data = data.get("data", {})
            confidence = result_data.get("analysis_confidence", "unknown")
            doc_type = result_data.get("document_type", "unknown")
            print(f"Document analysis result: type={doc_type}, confidence={confidence}")
            
            # Print a sample of the data
            if "medications" in result_data:
                medications = result_data.get("medications", [])
                if medications:
                    print(f"Found {len(medications)} medications including: {medications[0].get('name', 'unknown')}")
            
            # Check for errors
            if "error" in result_data:
                print(f"ERROR: {result_data.get('error')}")
    
    print("\n===== TEST COMPLETE =====\n")

if __name__ == "__main__":
    asyncio.run(test_document_analysis_through_agent())
