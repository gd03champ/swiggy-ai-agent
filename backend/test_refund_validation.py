"""
Test script for the refund validation workflow.

This script demonstrates how to use the image verification tools and refund workflow
together to validate refund requests.

Usage:
    python test_refund_validation.py
"""

import asyncio
import json
import base64
import os
from pprint import pprint

# Import the tools
from agent.tools.image_verification_tools import (
    create_refund_workflow, 
    update_refund_workflow, 
    get_refund_workflow_state, 
    verify_refund_image,
    get_refund_verification_criteria,
    process_refund_decision
)
from agent.tools.order_tools import get_order_details

async def test_refund_workflow():
    """Run through a complete refund workflow with image verification"""
    
    print("\n===== REFUND VALIDATION TEST =====\n")
    
    # 1. Use a test image - check if it exists, otherwise provide instructions
    image_path = "test_image.jpg"
    if not os.path.exists(image_path):
        print(f"Error: Test image not found at '{image_path}'")
        print("Please add a test image with filename 'test_image.jpg' to run this demo.")
        return
    
    # Load the test image as base64
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    # 2. Test order ID - we'll use a preset one that exists in your system
    test_order_id = "12345" # Change this to a valid order ID
    conversation_id = "test_conversation_123"
    reason = "My food was delivered cold and missing several items"
    
    print("\n----- STEP 1: Create refund workflow -----")
    result = create_refund_workflow(conversation_id, test_order_id)
    print("Workflow created:")
    pprint(result)
    
    print("\n----- STEP 2: Get order details -----")
    order_details = get_order_details(test_order_id)
    print("Order details:")
    pprint(order_details)
    
    print("\n----- STEP 3: Update workflow with reason -----")
    result = update_refund_workflow(conversation_id, "reason", reason)
    print("Updated workflow with reason:")
    pprint(result)
    
    # 4. Update workflow with image
    print("\n----- STEP 4: Update workflow with image flag -----")
    result = update_refund_workflow(conversation_id, "has_image", True)
    print("Updated workflow with image flag:")
    pprint(result)
    
    # 5. Get refund criteria
    print("\n----- STEP 5: Get refund criteria for reason category -----")
    workflow = get_refund_workflow_state(conversation_id)
    reason_category = workflow["current_state"]["reason_category"]
    result = get_refund_verification_criteria(reason_category)
    print(f"Verification criteria for '{reason_category}':")
    pprint(result)
    
    # 6. Verify the image
    print("\n----- STEP 6: Verify refund image -----")
    result = verify_refund_image(image_data, order_details, reason)
    print("Image verification result:")
    pprint(result)
    
    # 7. Update workflow with verification result
    print("\n----- STEP 7: Update workflow with verification result -----")
    update_result = update_refund_workflow(conversation_id, "image_verification_result", result)
    print("Updated workflow with verification result:")
    pprint(update_result)
    
    # 8. Get the updated workflow state
    print("\n----- STEP 8: Get updated workflow state -----")
    workflow = get_refund_workflow_state(conversation_id)
    print("Current workflow state:")
    pprint(workflow)
    
    # 9. Process the refund decision
    print("\n----- STEP 9: Process refund decision -----")
    # Here we use the verification score to determine how to proceed
    verification_data = result.get("data", {})
    verification_score = verification_data.get("verification_score", 0)
    
    if verification_score >= 70:
        recommendation = "approve"
        decision_notes = "Clear evidence supports the refund claim."
    elif verification_score >= 40:
        recommendation = "manual_review"
        decision_notes = "Evidence requires human review."
    else:
        recommendation = "reject"
        decision_notes = "Insufficient evidence to support the refund claim."
        
    result = process_refund_decision(
        conversation_id,
        verification_score,
        recommendation,
        decision_notes
    )
    print("Decision result:")
    pprint(result)
    
    print("\n===== TEST COMPLETED =====\n")
    
    # Print summary of the complete workflow state
    print("\n----- WORKFLOW SUMMARY -----")
    workflow = get_refund_workflow_state(conversation_id)
    print(f"Final state: {workflow['current_state']['stage']}")
    print(f"Recommendation: {workflow['current_state']['recommendation'] or 'None'}")
    print(f"Validation score: {workflow['current_state']['validation_score']}")
    
    # Return structured data exactly as it would appear in the frontend
    return {
        "workflow_state": {
            "type": "refund_workflow_state",
            "data": workflow
        },
        "image_verification": {
            "type": "image_verification_result",
            "data": verification_data
        }
    }


if __name__ == "__main__":
    # Run the async function
    result = asyncio.run(test_refund_workflow())
    
    print("\n===== STRUCTURED DATA OUTPUT =====")
    print("This is the format that would be shown in the frontend:")
    print(json.dumps(result, indent=2))
