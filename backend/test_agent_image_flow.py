"""
Test script to verify image handling in the refund workflow

This script demonstrates and tests the complete flow of a refund request with image processing
to confirm that images are properly analyzed through the agent tools system and not directly
by the LLM.

Usage:
    python test_agent_image_flow.py
"""

import asyncio
import json
import base64
import os
from pprint import pprint
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("test_image_flow")

# Use relative import to avoid ModuleNotFoundError
from backend.agent.agent import ChatbotAgent

async def test_refund_image_flow():
    """Test the complete flow of a refund request with image verification"""
    
    print("\n===== AGENT IMAGE WORKFLOW TEST =====\n")
    
    # 1. Use a test image - check if it exists, otherwise provide instructions
    image_path = "test_image.jpg"
    if not os.path.exists(image_path):
        print(f"Error: Test image not found at '{image_path}'")
        print("Please add a test image with filename 'test_image.jpg' to run this demo.")
        return
    
    # Load the test image as base64
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    # Create an agent instance
    agent = ChatbotAgent()
    
    # Define a conversation ID for the test
    conversation_id = "test_refund_flow_123"
    
    # Define test parameters
    test_order_id = "12345"  # This should be a valid order ID in your system
    refund_reason = "My strawberry milkshake was brown in color instead of pink"
    
    # Simulate a refund request conversation with image

    print("\n----- STEP 1: Initial Refund Request -----")
    # Simulate the first message with a refund request
    first_message = f"I want a refund for my order #{test_order_id}. {refund_reason}"
    
    print(f"User: {first_message}")
    print("Processing first message...")
    
    # Process the first message
    first_response_events = []
    first_structured_data = []
    
    async for event in agent.process_message(first_message, conversation_id):
        if event["type"] == "message":
            print(f"\nAgent response: {event['data'][:200]}...")  # First 200 chars
        elif event["type"] == "structured_data":
            print(f"Received structured data: {event['data']['type']}")
            first_structured_data.append(event["data"])
        first_response_events.append(event)
    
    print("\n----- STEP 2: Image Upload Message -----")
    # Simulate a second message with image upload
    second_message = "Here's a picture of the milkshake showing the problem"
    
    print(f"User: {second_message}")
    print("Processing image upload...")
    
    # Process the second message with an image
    second_response_events = []
    second_structured_data = []
    
    # Create media object with the image
    media = {
        "type": "image",
        "data": image_data,
        "metadata": {
            "name": "milkshake_problem.jpg",
            "type": "image/jpeg"
        }
    }
    
    # Process the message with the image
    async for event in agent.process_message(second_message, conversation_id, media=media):
        if event["type"] == "message":
            print(f"\nAgent response with image: {event['data'][:200]}...")  # First 200 chars
        elif event["type"] == "structured_data":
            print(f"Received structured data after image: {event['data']['type']}")
            second_structured_data.append(event["data"])
        elif event["type"] == "tool_start":
            print(f"Started tool: {event.get('name', 'unknown')}")
        elif event["type"] == "tool_end":
            print(f"Completed tool: {event.get('name', 'unknown')}")
        second_response_events.append(event)
    
    # Check for success indicators
    print("\n----- VALIDATION RESULTS -----")
    
    # Check for structured data in responses
    image_verification_found = False
    workflow_state_found = False
    
    for item in second_structured_data:
        if item["type"] == "image_verification_result":
            image_verification_found = True
            print("\nIMAGE VERIFICATION RESULT:")
            if "data" in item:
                verification_data = item["data"]
                if isinstance(verification_data, dict) and "data" in verification_data:
                    verification_data = verification_data["data"]
                print(f"- Score: {verification_data.get('verification_score', 'N/A')}")
                print(f"- Status: {verification_data.get('verification_status', 'N/A')}")
                print(f"- Recommendation: {verification_data.get('recommendation', 'N/A')}")
            
        if item["type"] == "refund_workflow_state":
            workflow_state_found = True
            print("\nWORKFLOW STATE:")
            if "data" in item and "current_state" in item["data"]:
                state = item["data"]["current_state"]
                print(f"- Stage: {state.get('stage', 'N/A')}")
                print(f"- Has Image: {state.get('has_image', False)}")
            
    # Look for verify_refund_image tool invocation
    verify_tool_called = False
    tool_used_image = False
    for event in second_response_events:
        if event["type"] == "tool_start" and event.get("name") == "verify_refund_image":
            verify_tool_called = True
            params = event.get("parameters", {})
            if params.get("image_data_param") in ["current_image", None]:
                tool_used_image = True
                print("\nVerify refund image tool was properly called with current image")
    
    # Print success or failure message
    print("\n===== TEST RESULTS =====")
    if verify_tool_called and tool_used_image:
        print("✅ SUCCESS: Agent properly called the verify_refund_image tool")
    else:
        print("❌ FAILURE: Agent did not properly call the verify_refund_image tool")
        
    if image_verification_found:
        print("✅ SUCCESS: Image verification result was properly processed and returned")
    else:
        print("❌ FAILURE: No image verification result was found in the response")
        
    if workflow_state_found:
        print("✅ SUCCESS: Refund workflow state was properly updated and returned")
    else:
        print("❌ FAILURE: No refund workflow state was found in the response")
    
    print("\n===== TEST COMPLETE =====\n")

if __name__ == "__main__":
    asyncio.run(test_refund_image_flow())
