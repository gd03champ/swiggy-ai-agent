"""
Order-related tools for the LangChain agent
"""
from datetime import datetime
from typing import Dict, Any, Optional

from bson import ObjectId
from langchain_core.tools import tool
from pymongo import MongoClient

# MongoDB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["restaurant_db"]
collection = db["placed_orders"]
refunds_collection = db["refunds"]  # Collection for storing refund data

@tool
def get_order_details(order_id: str) -> Dict[str, Any]:
    """
    Retrieve details about a specific order by its ID.
    
    Args:
        order_id: The ID of the order to retrieve
        
    Returns:
        Dictionary with order details or error message
    """
    try:
        # Find order by ID
        order = collection.find_one({"_id": ObjectId(order_id)})
        
        if order:
            # Convert ObjectId to string for JSON serialization
            order['_id'] = str(order['_id'])
            
            # Format for frontend display
            foods = order.get('foods', [])
            
            # Create order details in the expected format for frontend rendering
            return {
                "type": "order_details",
                "data": {
                    "order_id": order['_id'],
                    "status": "Delivered",  # Mock status for demo
                    "timestamp": datetime.now().isoformat(),
                    "items": [
                        {
                            "name": item.get('name', 'Unknown Item'),
                            "price": item.get('price', 0),
                            "quantity": item.get('quantity', 1)
                        }
                        for item in foods
                    ],
                    "total_price": order.get('total_price', 0)
                }
            }
        else:
            return {"error": "Order not found", "message": f"No order found with ID: {order_id}"}
    except Exception as e:
        return {"error": "Error retrieving order", "message": str(e)}

@tool
def initiate_refund(order_id: str, reason: str, validation_details: str = "") -> Dict[str, Any]:
    """
    Initiate a refund for an order based on evidence validation
    
    Args:
        order_id: The ID of the order to refund
        reason: The main reason for the refund request (e.g., "Food quality issue", "Wrong items")
        validation_details: Optional details about image validation results or other evidence
        
    Returns:
        Dictionary with refund status or error message
    """
    try:
        # Verify the order exists
        try:
            order = collection.find_one({"_id": ObjectId(order_id)})
        except:
            # Handle case where order_id might not be a valid ObjectId
            return {"error": "Invalid order ID", "message": f"The order ID '{order_id}' is not valid"}
        
        if not order:
            return {"error": "Order not found", "message": f"No order found with ID: {order_id}"}
        
        # Convert ObjectId to string
        order_id_str = str(order["_id"])
        total_amount = order.get("total_price", 0)
        
        # Create a more detailed reason with validation info if provided
        detailed_reason = reason
        if validation_details:
            detailed_reason = f"{reason}\n\nEvidence assessment: {validation_details}"
        
        # Check if the reason contains specific validation keywords
        # This simulates validation logic for demo purposes
        lower_reason = reason.lower()
        status = "Approved"
        processing_time = 0  # Instant for approved
        
        # For demonstration purposes, we'll approve or reject based on keywords
        rejection_keywords = ["insufficient evidence", "no image", "cannot verify", 
                             "unclear image", "blurry", "fake", "fraudulent"]
                             
        pending_keywords = ["needs review", "partially visible", "unclear if"]
        
        for keyword in rejection_keywords:
            if keyword.lower() in lower_reason or keyword.lower() in validation_details.lower():
                status = "Rejected"
                break
                
        for keyword in pending_keywords:
            if keyword.lower() in lower_reason or keyword.lower() in validation_details.lower():
                status = "Processing"
                processing_time = 2  # 2 days for processing
                break
        
        # Check if refund already exists for this order
        existing_refund = refunds_collection.find_one({"order_id": order_id_str})
        if existing_refund:
            # Convert MongoDB ObjectId to string for JSON serialization
            existing_refund["_id"] = str(existing_refund["_id"])
            
            return {
                "type": "refund_status",
                "data": existing_refund,
                "message": "A refund request already exists for this order"
            }
        
        # Generate unique refund ID
        refund_id = f"RF{int(datetime.now().timestamp())}"
            
        # Create a detailed refund object
        refund_data = {
            "order_id": order_id_str,
            "status": status,
            "amount": total_amount,
            "reason": detailed_reason,
            "timestamp": datetime.now().isoformat(),
            "estimated_days": processing_time,
            "refund_id": refund_id
        }
        
        # Store the refund request in MongoDB
        refunds_collection.insert_one(refund_data)
        
        # Update the original order with refund status
        collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {
                "refund_status": status,
                "refund_id": refund_id,
                "refund_timestamp": datetime.now().isoformat()
            }}
        )
        
        print(f"Refund {refund_id} created for order {order_id_str} with status: {status}")
        
        # Return formatted for frontend rendering
        return {
            "type": "refund_status",
            "data": refund_data
        }
    except Exception as e:
        return {"error": "Error processing refund", "message": str(e)}

@tool
def get_refund_details(order_id: str) -> Dict[str, Any]:
    """
    Retrieve refund details for a specific order by its ID.
    
    Args:
        order_id: The ID of the order to check refund status for
        
    Returns:
        Dictionary with refund details or error message
    """
    try:
        # Try to convert to ObjectId if it's not already
        try:
            obj_id = ObjectId(order_id)
        except:
            return {"error": "Invalid order ID", "message": f"The order ID '{order_id}' is not valid"}
            
        # First check if the order exists
        order = collection.find_one({"_id": obj_id})
        if not order:
            return {"error": "Order not found", "message": f"No order found with ID: {order_id}"}
            
        order_id_str = str(order["_id"])
            
        # Look for refund associated with this order
        refund = refunds_collection.find_one({"order_id": order_id_str})
        
        if not refund:
            return {
                "type": "refund_status",
                "data": {
                    "order_id": order_id_str,
                    "status": "No Refund",
                    "message": "No refund has been requested for this order"
                }
            }
        
        # Convert ObjectId to string for JSON serialization
        refund["_id"] = str(refund["_id"])
        
        # Return formatted for frontend rendering
        return {
            "type": "refund_status",
            "data": refund
        }
    except Exception as e:
        return {"error": "Error retrieving refund details", "message": str(e)}
