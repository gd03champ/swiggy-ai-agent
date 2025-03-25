"""
Image verification tools for refund request validation
"""

import base64
import json
from typing import Dict, Any, Optional, List, Union
import logging

from langchain_core.tools import tool
from langchain.pydantic_v1 import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FoodImageVerificationResponse(BaseModel):
    """Response model for food image verification"""
    verification_score: int = Field(..., description="Verification confidence score (0-100)")
    verification_status: str = Field(..., description="Verification status (verified/unverified/inconclusive)")
    detected_issues: List[str] = Field(..., description="List of detected issues in the image")
    matches_order_items: bool = Field(..., description="Whether image appears to match order items")
    verification_notes: str = Field(..., description="Detailed verification notes")
    flagged_issues: List[str] = Field(..., description="Issues that require human verification")
    recommendation: str = Field(..., description="Recommended action (approve/reject/manual_review)")

@tool
def verify_refund_image(image_data_param: str, order_details: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """
    Verify an image submitted for a refund request against order details and reason.
    
    This tool analyzes the provided image in the context of the stated refund reason
    and order details to determine if the evidence supports the refund request.
    
    Args:
        image_data_param: Base64 encoded image string (from user upload) or 'current_image' to use from agent
        order_details: Dictionary containing order details for cross-reference
        reason: The stated reason for the refund request

    Returns:
        Dictionary with verification results and recommendation
    """
    logger.info(f"Verifying refund image for reason: {reason}")

    # Import for getting access to agent
    import importlib
    import sys
    
    # Check if we need to get the image from the agent's global state
    image_data = image_data_param
    if image_data == 'current_image' or not image_data:
        try:
            # Try to access the agent instance to get the current image data
            # This is a bit of a hack, but it works to connect the tools with global state
            agent_mod = sys.modules.get('backend.agent.agent', None)
            if agent_mod:
                for attr_name in dir(agent_mod):
                    attr = getattr(agent_mod, attr_name)
                    if hasattr(attr, '_current_image_data'):
                        agent_instance = attr
                        if agent_instance._current_image_data:
                            image_data = agent_instance._current_image_data
                            logger.info("Successfully retrieved image data from agent state")
                            break
            
            # If we couldn't get the image, log an error
            if not image_data or image_data == 'current_image':
                logger.error("Failed to retrieve image data from agent state")
                return {
                    "error": "No image data provided",
                    "message": "Image data is required for verification but was not provided"
                }
        except Exception as e:
            logger.error(f"Error accessing agent image data: {str(e)}")
            return {
                "error": "Failed to access image data",
                "message": str(e)
            }
    
    try:
        # Process order details for cleaner formatting
        if isinstance(order_details, dict):
            if "data" in order_details and isinstance(order_details["data"], dict):
                order_details = order_details["data"]
                
            order_id = order_details.get("order_id", "unknown")
            items = order_details.get("items", [])
            item_names = [item.get("name", "unknown") for item in items] if isinstance(items, list) else []
            
            logger.info(f"Order ID: {order_id}, Items: {item_names}")
        else:
            logger.warning("Order details not in expected format")
            
        # Get verification criteria for this reason type
        reason_lower = reason.lower()
        reason_category = "other"
        if "missing" in reason_lower or "incomplete" in reason_lower:
            reason_category = "missing_items"
        elif "damaged" in reason_lower or "spill" in reason_lower:
            reason_category = "damaged"
        elif "cold" in reason_lower or "temperature" in reason_lower:
            reason_category = "cold_food"
        elif "quality" in reason_lower or "stale" in reason_lower:
            reason_category = "quality_issues"
        elif "wrong" in reason_lower:
            reason_category = "wrong_items"
            
        # Create formatted order summary for the LLM
        order_summary = f"Order #{order_id} containing: {', '.join(item_names)}"
        
        # Create a multimodal prompt for the LLM to analyze the image
        prompt = f"""Analyze this food image for a refund verification:

REFUND REQUEST DETAILS:
- Order: {order_summary}
- Customer reason: "{reason}"
- Category: {reason_category}

VERIFICATION TASK:
Examine the image to determine if it provides evidence supporting the customer's refund reason.
Provide your analysis in the following JSON format:

```json
{{
  "verification_score": [0-100 numeric score representing confidence in verification],
  "verification_status": ["verified", "unverified", or "inconclusive"],
  "detected_issues": [array of specific issues detected in the food],
  "matches_order_items": [boolean: true if items in image appear to match order details],
  "verification_notes": [detailed explanation of your analysis],
  "flagged_issues": [array of concerns that would require human verification],
  "recommendation": ["approve", "reject", or "manual_review"]
}}
```

BE HIGHLY SKEPTICAL AND CRITICAL - DEMAND CLEAR EVIDENCE:
- Score above 70 ONLY if evidence CLEARLY AND UNDENIABLY supports the refund reason
- Default to "inconclusive" unless evidence is very strong
- Recommendation should be "manual_review" unless evidence is extremely clear
- Look for inconsistencies between the image and the stated reason
- Be especially critical of subjective claims (temperature, taste) that are hard to verify
- Check if what's visible in the image matches the ordered items

FORMAT RESPONSE AS VALID JSON ONLY.
"""
        # Import inline to avoid circular imports
        from ..client import BedrockClientSetup
        
        # Create a client for multimodal analysis
        llm = BedrockClientSetup.get_llm()
        
        # Format the multimodal message with image and prompt
        multimodal_message = BedrockClientSetup.create_multimodal_message(prompt, [image_data])
        
        # Create a human message with the multimodal content
        human_message = HumanMessage(content=multimodal_message)
        
        # Send to the LLM for analysis
        logger.info("Sending image to LLM for verification analysis")
        
        # Create a simple message list with just the prompt+image
        messages = [human_message]
        
        try:
            # Invoke the LLM
            response = llm.invoke(messages)
            
            # Extract the content from the response
            llm_analysis = response.content
            
            # Try to parse the JSON from the LLM response
            # First look for JSON code blocks with ```json ... ``` format
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', llm_analysis)
            
            parsed_response = None
            if json_match:
                try:
                    json_str = json_match.group(1).strip()
                    parsed_response = json.loads(json_str)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from code block")
            
            # If that didn't work, try to parse the whole response as JSON
            if not parsed_response:
                try:
                    parsed_response = json.loads(llm_analysis)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse response as JSON")
                    
            # If we still don't have valid JSON, extract key-value pairs using regex
            if not parsed_response:
                logger.warning("Using fallback extraction for verification data")
                parsed_response = {
                    "verification_score": 50,
                    "verification_status": "inconclusive",
                    "detected_issues": [],
                    "matches_order_items": False,
                    "verification_notes": "Unable to extract structured verification data from analysis",
                    "flagged_issues": ["Structured data extraction failed"],
                    "recommendation": "manual_review"
                }
                
                # Try to extract verification score
                score_match = re.search(r'"verification_score":\s*(\d+)', llm_analysis)
                if score_match:
                    parsed_response["verification_score"] = int(score_match.group(1))
                    
                # Try to extract verification status
                status_match = re.search(r'"verification_status":\s*"(\w+)"', llm_analysis)
                if status_match:
                    parsed_response["verification_status"] = status_match.group(1)
                    
                # Try to extract recommendation
                recommendation_match = re.search(r'"recommendation":\s*"(\w+)"', llm_analysis)
                if recommendation_match:
                    parsed_response["recommendation"] = recommendation_match.group(1)
                    
                # Try to extract notes
                notes_match = re.search(r'"verification_notes":\s*"([^"]+)"', llm_analysis)
                if notes_match:
                    parsed_response["verification_notes"] = notes_match.group(1)
                    
            # Ensure we have all required fields with sensible defaults
            verification_result = {
                "verification_score": parsed_response.get("verification_score", 50),
                "verification_status": parsed_response.get("verification_status", "inconclusive"),
                "detected_issues": parsed_response.get("detected_issues", []),
                "matches_order_items": parsed_response.get("matches_order_items", False),
                "verification_notes": parsed_response.get("verification_notes", "Image analysis results inconclusive"),
                "flagged_issues": parsed_response.get("flagged_issues", []),
                "recommendation": parsed_response.get("recommendation", "manual_review"),
                "image_analyzed": True,
                "order_id": order_id,
                "raw_analysis": llm_analysis[:500] + ("..." if len(llm_analysis) > 500 else "")
            }
            
        except Exception as llm_error:
            logger.error(f"Error during LLM image analysis: {str(llm_error)}")
            # Fallback to basic verification
            verification_result = {
                "verification_score": 30,
                "verification_status": "error",
                "detected_issues": [],
                "matches_order_items": False,
                "verification_notes": f"Error during image analysis: {str(llm_error)}",
                "flagged_issues": ["Image analysis failed"],
                "recommendation": "manual_review",
                "image_analyzed": False,
                "order_id": order_id
            }
        
        logger.info(f"Image verification complete with recommendation: {verification_result['recommendation']}")
        
        return {
            "type": "image_verification_result",
            "data": verification_result
        }
    except Exception as e:
        logger.error(f"Error verifying refund image: {str(e)}", exc_info=True)
        return {
            "error": "Failed to process image verification",
            "message": str(e)
        }

@tool
def get_refund_verification_criteria(reason_type: str) -> Dict[str, Any]:
    """
    Get the verification criteria for a specific refund reason type.
    
    Args:
        reason_type: The type of refund reason (e.g., "damaged", "missing items", "quality")
        
    Returns:
        Dictionary with verification criteria and guidelines
    """
    criteria_map = {
        "damaged": {
            "required_evidence": [
                "Clear image of damaged packaging or food",
                "Visible damage must match description",
                "Food item must be identifiable as the ordered item"
            ],
            "auto_approval_threshold": 80,
            "escalation_threshold": 50,
            "verification_tips": "Look for obvious signs of crushing, spilling, or torn packaging"
        },
        "missing_items": {
            "required_evidence": [
                "Image showing all delivered items",
                "Must be able to count items and compare with order",
                "Package/container should be visible to verify completeness"
            ],
            "auto_approval_threshold": 90,
            "escalation_threshold": 60,
            "verification_tips": "Check that all ordered items are accounted for in the image"
        },
        "quality_issues": {
            "required_evidence": [
                "Clear close-up image of quality problem",
                "Visible indicators of spoilage, mold, or foreign objects",
                "Problem must be clearly attributable to the food, not storage"
            ],
            "auto_approval_threshold": 85,
            "escalation_threshold": 55,
            "verification_tips": "Look for discoloration, mold, or foreign materials"
        },
        "wrong_items": {
            "required_evidence": [
                "Image clearly showing received item packaging/labels",
                "Item must be visibly different from what was ordered",
                "Packaging should be visible to confirm item identity"
            ],
            "auto_approval_threshold": 85,
            "escalation_threshold": 60,
            "verification_tips": "Compare item labels and appearance with what was ordered"
        },
        "cold_food": {
            "required_evidence": [
                "Image showing food in delivered state",
                "Time stamp verification (delivery time vs. complaint time)",
                "Visual evidence supporting temperature claim (congealed fats, solidified sauce)"
            ],
            "auto_approval_threshold": 60,
            "escalation_threshold": 40,
            "verification_tips": "Temperature is hard to verify from images alone, look for visual cues"
        },
        "late_delivery": {
            "required_evidence": [
                "Timestamp verification only",
                "No image required",
                "System delivery time vs promised delivery window"
            ],
            "auto_approval_threshold": 95,
            "escalation_threshold": 70,
            "verification_tips": "Purely time-based verification from system logs"
        }
    }
    
    # Default criteria if specific type not found
    default_criteria = {
        "required_evidence": [
            "Clear image showing the issue",
            "Issue must be clearly visible and match description",
            "Ordered items must be identifiable in the image"
        ],
        "auto_approval_threshold": 70,
        "escalation_threshold": 50,
        "verification_tips": "Verify that the image clearly shows the reported problem"
    }
    
    return {
        "criteria": criteria_map.get(reason_type.lower(), default_criteria),
        "reason_type": reason_type
    }

class RefundWorkflowState(BaseModel):
    """Model for tracking refund workflow state"""
    order_id: str = Field(..., description="Order ID for this refund request")
    stage: str = Field(..., description="Current stage in the workflow (collection/validation/decision)")
    reason: Optional[str] = Field(None, description="Stated reason for refund")
    reason_category: Optional[str] = Field(None, description="Categorized reason for refund")
    has_image: bool = Field(False, description="Whether image evidence has been provided")
    image_verification_result: Optional[Dict[str, Any]] = Field(None, description="Results of image verification")
    collected_data: Dict[str, Any] = Field(default_factory=dict, description="All data collected in this workflow")
    validation_score: Optional[int] = Field(None, description="Overall validation score (0-100)")
    recommendation: Optional[str] = Field(None, description="Final recommendation (approve/reject/review)")
    issues_detected: List[str] = Field(default_factory=list, description="Issues detected during validation")

# Global in-memory storage for refund workflow states
_refund_workflow_states = {}

@tool
def create_refund_workflow(conversation_id: str, order_id: str) -> Dict[str, Any]:
    """
    Initialize a new refund workflow for tracking the multi-step refund process.
    
    Args:
        conversation_id: Unique conversation identifier
        order_id: Order ID for the refund request
        
    Returns:
        Dictionary with the initial workflow state
    """
    global _refund_workflow_states
    
    initial_state = {
        "order_id": order_id,
        "stage": "collection",  # Starts in collection stage
        "reason": None,
        "reason_category": None,
        "has_image": False,
        "image_verification_result": None,
        "collected_data": {},
        "validation_score": 0,
        "recommendation": None,
        "issues_detected": []
    }
    
    _refund_workflow_states[conversation_id] = initial_state
    logger.info(f"Created refund workflow for conversation {conversation_id}, order {order_id}")
    
    return {
        "status": "created",
        "workflow_id": conversation_id,
        "order_id": order_id,
        "current_stage": "collection",
        "next_required": "reason"
    }

@tool
def update_refund_workflow(
    conversation_id: str, 
    field: str, 
    value: Union[str, Dict, List, bool, int]
) -> Dict[str, Any]:
    """
    Update a specific field in the refund workflow state.
    
    Args:
        conversation_id: Unique conversation identifier
        field: Field name to update (reason, has_image, etc.)
        value: New value for the field
        
    Returns:
        Dictionary with the updated workflow state
    """
    global _refund_workflow_states
    
    if conversation_id not in _refund_workflow_states:
        return {
            "error": "Workflow not found",
            "message": f"No refund workflow found for conversation ID: {conversation_id}"
        }
        
    workflow = _refund_workflow_states[conversation_id]
    
    # Update the specified field
    if field in workflow:
        workflow[field] = value
        
        # Special case updates
        if field == "reason":
            # Categorize the reason automatically
            reason_lower = value.lower()
            if "missing" in reason_lower or "incomplete" in reason_lower:
                workflow["reason_category"] = "missing_items"
            elif "damaged" in reason_lower or "spill" in reason_lower:
                workflow["reason_category"] = "damaged"
            elif "cold" in reason_lower or "temperature" in reason_lower:
                workflow["reason_category"] = "cold_food"
            elif "quality" in reason_lower or "stale" in reason_lower or "spoil" in reason_lower:
                workflow["reason_category"] = "quality_issues"
            elif "wrong" in reason_lower:
                workflow["reason_category"] = "wrong_items"
            elif "late" in reason_lower:
                workflow["reason_category"] = "late_delivery"
            else:
                workflow["reason_category"] = "other"
                
        # Check for stage transitions
        if field == "has_image" and value is True:
            # If we have order ID, reason, and image, move to validation stage
            if workflow.get("order_id") and workflow.get("reason"):
                workflow["stage"] = "validation"
                
        # Update the stored workflow
        _refund_workflow_states[conversation_id] = workflow
        
        return {
            "status": "updated",
            "field": field,
            "workflow": workflow
        }
    else:
        return {
            "error": "Invalid field",
            "message": f"Field '{field}' is not a valid workflow field"
        }

@tool
def get_refund_workflow_state(conversation_id: str) -> Dict[str, Any]:
    """
    Get the current state of a refund workflow.
    
    Args:
        conversation_id: Unique conversation identifier
        
    Returns:
        Dictionary with the current workflow state
    """
    global _refund_workflow_states
    
    if conversation_id not in _refund_workflow_states:
        return {
            "error": "Workflow not found",
            "message": f"No refund workflow found for conversation ID: {conversation_id}"
        }
        
    workflow = _refund_workflow_states[conversation_id]
    
    # Determine what's needed next
    next_required = None
    if workflow["stage"] == "collection":
        if not workflow.get("order_id"):
            next_required = "order_id"
        elif not workflow.get("reason"):
            next_required = "reason"
        elif not workflow.get("has_image") and workflow.get("reason_category") != "late_delivery":
            next_required = "image"
        else:
            next_required = "proceed_to_validation"
    elif workflow["stage"] == "validation":
        if not workflow.get("image_verification_result"):
            next_required = "verify_image"
        else:
            next_required = "make_decision"
    
    response = {
        "workflow_id": conversation_id,
        "current_state": workflow,
        "current_stage": workflow["stage"],
        "next_required": next_required,
        "is_complete": workflow["stage"] == "decision" and workflow.get("recommendation") is not None
    }
    
    return response

@tool
def process_refund_decision(
    conversation_id: str,
    validation_score: int,
    recommendation: str,
    decision_notes: str
) -> Dict[str, Any]:
    """
    Process the final decision for a refund request.
    
    Args:
        conversation_id: Unique conversation identifier
        validation_score: Final validation score (0-100)
        recommendation: Recommended action (approve/reject/manual_review)
        decision_notes: Notes explaining the decision
        
    Returns:
        Dictionary with the final decision details for use with initiate_refund
    """
    global _refund_workflow_states
    
    if conversation_id not in _refund_workflow_states:
        return {
            "error": "Workflow not found",
            "message": f"No refund workflow found for conversation ID: {conversation_id}"
        }
        
    workflow = _refund_workflow_states[conversation_id]
    
    # Update the workflow with decision information
    workflow["stage"] = "decision"
    workflow["validation_score"] = validation_score
    workflow["recommendation"] = recommendation
    workflow["decision_notes"] = decision_notes
    
    # Determine refund status based on recommendation and score
    refund_status = "Processing"  # Default for manual review
    if recommendation == "approve" and validation_score >= 70:
        refund_status = "Approved"
    elif recommendation == "reject":
        refund_status = "Rejected"
    
    # Prepare the validation details for the refund tool
    validation_details = (
        f"Decision: {recommendation.upper()}\n"
        f"Confidence Score: {validation_score}/100\n"
        f"Evidence Assessment: {decision_notes}\n"
    )
    
    if workflow.get("image_verification_result"):
        img_result = workflow["image_verification_result"]
        if isinstance(img_result, dict) and "data" in img_result:
            img_result = img_result["data"]
            
        if isinstance(img_result, dict):
            validation_details += (
                f"Image Verification: {img_result.get('verification_status', 'Unknown')}\n"
                f"Detected Issues: {', '.join(img_result.get('detected_issues', ['None']))}\n"
                f"Verification Notes: {img_result.get('verification_notes', 'N/A')}"
            )
    
    # Store the decision in the workflow
    _refund_workflow_states[conversation_id] = workflow
    
    return {
        "order_id": workflow["order_id"],
        "validation_details": validation_details,
        "refund_status": refund_status,
        "recommendation": recommendation,
        "validation_score": validation_score,
        "ready_for_refund_tool": True  # Indicates this can be used with initiate_refund
    }
