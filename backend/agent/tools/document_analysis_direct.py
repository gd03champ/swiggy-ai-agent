"""
Direct versions of document analysis functions for testing purposes.
These functions implement the same logic as the tools but without the LangChain tool wrapper.
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def analyze_document_direct(image_data: str, doc_type: str = "prescription") -> Dict[str, Any]:
    """
    Direct implementation of document analysis without the tool wrapper for testing purposes.
    
    Args:
        image_data: Base64 encoded image string
        doc_type: Type of document to analyze (prescription, lab_report, diet_plan, etc.)
        
    Returns:
        Structured data with extracted medical information
    """
    logger.info(f"Analyzing medical document of type: {doc_type}")
    
    # For backward compatibility with the original tool
    image_data_param = image_data
    
    try:
        # Create prompts based on document type
        if doc_type.lower() == "prescription":
            prompt = """Analyze this medical prescription image carefully and extract the following information in structured form:

1. Patient information (name, age, gender, etc.)
2. Doctor details (name, credentials, hospital/clinic)
3. Diagnosis/condition (if mentioned)
4. Medications prescribed:
   - Drug names
   - Dosages
   - Frequency
   - Duration
5. Special instructions (if any)
6. Dietary restrictions or recommendations (if any)
7. Date of prescription
8. Follow-up instructions (if any)

IF THE IMAGE QUALITY IS POOR OR TEXT IS ILLEGIBLE:
Indicate which parts you cannot read clearly.

IMPORTANT: Format your response as valid JSON matching this schema:
```json
{
  "patient_info": {
    "name": "string or null if not visible",
    "age": "string or null",
    "gender": "string or null",
    "other_details": "string or null"
  },
  "doctor_info": {
    "name": "string or null",
    "credentials": "string or null",
    "hospital": "string or null"
  },
  "diagnosis": "string or null",
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string",
      "notes": "string or null"
    }
  ],
  "dietary_recommendations": ["string"] or [],
  "date": "string or null",
  "follow_up": "string or null",
  "special_notes": "string or null",
  "analysis_confidence": "number between 0-100",
  "illegible_parts": ["string"] or []
}
```

RETURN ONLY THE JSON OBJECT WITHOUT ANY ADDITIONAL TEXT.
"""
        elif doc_type.lower() == "lab_report":
            prompt = """Analyze this medical lab report image carefully and extract the following information in structured form:

1. Patient information (name, age, gender, etc.)
2. Lab/healthcare facility details
3. Date of test/report
4. Test results and parameters with their normal ranges
5. Interpretation or comments from the lab
6. Doctor/physician name (if available)

IMPORTANT: Format your response as valid JSON matching this schema:
```json
{
  "patient_info": {
    "name": "string or null if not visible",
    "age": "string or null",
    "gender": "string or null",
    "id": "string or null"
  },
  "lab_info": {
    "name": "string or null",
    "contact": "string or null"
  },
  "date": "string or null",
  "test_results": [
    {
      "parameter": "string",
      "result": "string",
      "normal_range": "string",
      "status": "normal/high/low/null"
    }
  ],
  "comments": "string or null",
  "physician": "string or null",
  "analysis_confidence": "number between 0-100",
  "illegible_parts": ["string"] or []
}
```

RETURN ONLY THE JSON OBJECT WITHOUT ANY ADDITIONAL TEXT.
"""
        elif doc_type.lower() == "diet_plan":
            prompt = """Analyze this diet plan or nutritional document image carefully and extract the following information:

1. Patient/client information (if available)
2. Nutritionist/dietitian details (if available)
3. Dietary goals or target condition
4. Calorie restrictions (if mentioned)
5. Meal plan structure
6. Recommended foods and portions
7. Foods to avoid/limit
8. Special instructions or notes
9. Duration of the diet plan

IMPORTANT: Format your response as valid JSON matching this schema:
```json
{
  "patient_info": {
    "name": "string or null if not visible",
    "other_details": "string or null"
  },
  "nutritionist_info": {
    "name": "string or null",
    "credentials": "string or null"
  },
  "dietary_goals": "string or null",
  "calorie_target": "string or null",
  "meal_plan": [
    {
      "meal": "string (e.g., Breakfast, Lunch)",
      "foods": ["string"],
      "portions": "string or null",
      "notes": "string or null"
    }
  ],
  "foods_recommended": ["string"],
  "foods_to_avoid": ["string"],
  "special_instructions": "string or null",
  "duration": "string or null",
  "analysis_confidence": "number between 0-100",
  "illegible_parts": ["string"] or []
}
```

RETURN ONLY THE JSON OBJECT WITHOUT ANY ADDITIONAL TEXT.
"""
        else:
            # Generic document analysis prompt
            prompt = f"""Analyze this {doc_type} document image carefully and extract the key information in structured form.
Identify the type of document, key fields, and important information contained within.

IMPORTANT: Format your response as valid JSON with appropriate keys based on the document type.
Include an "analysis_confidence" field with a number between 0-100 indicating your confidence in the accuracy of extraction.
Also include an "illegible_parts" array listing any sections that were unclear or unreadable.

RETURN ONLY THE JSON OBJECT WITHOUT ANY ADDITIONAL TEXT.
"""
        
        # Import inline to avoid circular imports
        from ..client import BedrockClientSetup
        
        # Create a client for multimodal analysis
        llm = BedrockClientSetup.get_llm()
        
        # Format the multimodal message with image and prompt
        multimodal_message = BedrockClientSetup.create_multimodal_message(prompt, [image_data])
        
        # Create a human message with the multimodal content
        from langchain_core.messages import HumanMessage
        human_message = HumanMessage(content=multimodal_message)
        
        # Send to the LLM for analysis
        logger.info(f"Sending {doc_type} image to LLM for analysis")
        
        # Create a message list for the LLM
        messages = [human_message]
        
        try:
            # Invoke the LLM
            response = llm.invoke(messages)
            
            # Extract the content from the response
            llm_analysis = response.content
            
            # Try to parse the JSON from the LLM response
            # First look for JSON code blocks with ```json ... ``` format
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
            
            # If we still don't have valid JSON, use a dictionary with error
            if not parsed_response:
                parsed_response = {
                    "error": "Failed to parse LLM response as JSON",
                    "raw_text": llm_analysis[:500] + ("..." if len(llm_analysis) > 500 else ""),
                    "document_type": doc_type,
                    "analysis_confidence": 0
                }
            
            # Add document type to the response
            if isinstance(parsed_response, dict):
                parsed_response["document_type"] = doc_type
                
                # Ensure there's an analysis confidence field
                if "analysis_confidence" not in parsed_response:
                    parsed_response["analysis_confidence"] = 70  # Default confidence
            
            logger.info(f"Document analysis complete with confidence: {parsed_response.get('analysis_confidence', 'unknown')}")
            
            return {
                "type": "document_analysis_result",
                "data": parsed_response
            }
            
        except Exception as llm_error:
            logger.error(f"Error during LLM document analysis: {str(llm_error)}")
            return {
                "type": "document_analysis_result",
                "data": {
                    "error": f"Error analyzing document: {str(llm_error)}",
                    "document_type": doc_type,
                    "analysis_confidence": 0,
                    "error_details": str(llm_error)
                }
            }
    
    except Exception as e:
        logger.error(f"Error analyzing document: {str(e)}", exc_info=True)
        return {
            "type": "document_analysis_result",
            "data": {
                "error": f"Failed to analyze document: {str(e)}",
                "document_type": doc_type
            }
        }

async def get_dietary_recommendations_direct(medical_condition: str, restrictions: List[str] = None) -> Dict[str, Any]:
    """
    Direct implementation of dietary recommendations without the tool wrapper for testing purposes.
    
    Args:
        medical_condition: Medical condition or health goal to address
        restrictions: List of dietary restrictions or allergies
        
    Returns:
        Dictionary with meal recommendations and guidelines
    """
    logger.info(f"Getting dietary recommendations for condition: {medical_condition}")
    
    if not restrictions:
        restrictions = []
        
    # Format restrictions for prompt
    restrictions_text = ", ".join(restrictions) if restrictions else "None specified"
    
    try:
        # Import inline to avoid circular imports
        from ..client import BedrockClientSetup
        
        # Create a client for analysis
        llm = BedrockClientSetup.get_llm()
        
        # Create prompt for dietary recommendations
        prompt = f"""Provide evidence-based dietary recommendations for someone with {medical_condition}.
        
Dietary restrictions/allergies: {restrictions_text}

Generate a comprehensive meal plan and dietary guidelines following this structure:

1. Overall dietary approach
2. Foods to emphasize
3. Foods to limit or avoid
4. Sample meal plan (breakfast, lunch, dinner, snacks)
5. Special considerations for this condition
6. Scientific rationale for recommendations

Format your response as valid JSON matching this schema:
```json
{{
  "condition": "{medical_condition}",
  "restrictions": {json.dumps(restrictions)},
  "dietary_approach": "string",
  "foods_to_emphasize": ["string"],
  "foods_to_limit": ["string"],
  "meal_plan": {{
    "breakfast": ["string"],
    "lunch": ["string"],
    "dinner": ["string"],
    "snacks": ["string"]
  }},
  "special_considerations": "string",
  "scientific_rationale": "string"
}}
```
        
RETURN ONLY THE JSON OBJECT WITHOUT ANY ADDITIONAL TEXT.
"""
        
        # Create a human message with the prompt
        from langchain_core.messages import HumanMessage
        human_message = HumanMessage(content=prompt)
        
        # Send to the LLM for analysis
        logger.info(f"Requesting dietary recommendations from LLM")
        
        # Create a message list for the LLM
        messages = [human_message]
        
        # Invoke the LLM
        response = llm.invoke(messages)
        
        # Extract the content from the response
        llm_analysis = response.content
        
        # Try to parse the JSON from the LLM response
        # First look for JSON code blocks with ```json ... ``` format
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
        
        # If we still don't have valid JSON, use a dictionary with the raw response
        if not parsed_response:
            parsed_response = {
                "condition": medical_condition,
                "restrictions": restrictions,
                "raw_recommendations": llm_analysis,
                "error": "Failed to parse structured recommendations"
            }
        
        # Return the recommendations
        return {
            "type": "dietary_recommendations",
            "data": parsed_response
        }
        
    except Exception as e:
        logger.error(f"Error getting dietary recommendations: {str(e)}", exc_info=True)
        return {
            "type": "dietary_recommendations",
            "data": {
                "condition": medical_condition,
                "restrictions": restrictions,
                "error": f"Failed to generate recommendations: {str(e)}"
            }
        }
