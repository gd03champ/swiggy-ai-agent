"""
FastAPI backend for food delivery app chatbot
"""
import aiohttp
import asyncio
import json
import uuid
import time
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, AsyncGenerator
from fastapi.middleware.cors import CORSMiddleware

# Import our chatbot agent
from backend.agent.agent import ChatbotAgent

app = FastAPI()

# Initialize the chatbot agent
chatbot = ChatbotAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly allow DELETE
    allow_headers=["*"],
)

# In-memory database for orders and conversations
orders_db = {}
conversations_db = {}

# Model for the restaurant request parameters
class RestaurantRequest(BaseModel):
    latitude: float
    longitude: float
    restaurant_id: str

class FoodItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    foods: List[FoodItem]

class ConversationHistoryRequest(BaseModel):
    user_id: Optional[str] = None
    limit: int = 10
    offset: int = 0
    sort_by: str = "timestamp"
    sort_order: int = -1  # -1 for descending, 1 for ascending


@app.post("/create_order/")
async def create_order(order: Order):
    try:
        # Calculate total price
        total_price = sum(food.price * food.quantity for food in order.foods)

        # Create order document
        order_id = str(uuid.uuid4())
        
        order_doc = {
            "order_id": order_id,
            "foods": [food.dict() for food in order.foods],
            "total_price": total_price,
            "timestamp": datetime.now().isoformat()
        }

        # Save to in-memory database
        orders_db[order_id] = order_doc

        # Return order details
        return {
            "order_id": order_id,
            "foods": order.foods,
            "total_price": total_price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_order/{order_id}")
async def get_order(order_id: str):
    try:
        # Find order by ID
        if order_id in orders_db:
            return orders_db[order_id]
        else:
            raise HTTPException(status_code=404, detail="Order not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# Import the SwiggyAPIClient
from backend.services.swiggy_api_client import SwiggyAPIClient

# Direct API endpoints for Swiggy
@app.get("/api/restaurants")
async def get_restaurants(lat: float, lng: float, page_type: str = "COLLECTION"):
    """Get restaurant listings directly from Swiggy API"""
    try:
        data = await SwiggyAPIClient.get_restaurants(lat, lng, page_type)
        if "error" in data:
            raise HTTPException(status_code=500, detail=data["error"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/menu")
async def get_menu_api(
    lat: float, 
    lng: float, 
    restaurantId: str,
    page_type: str = "REGULAR_MENU", 
    complete_menu: bool = True,
    submitAction: str = "ENTER"
):
    """Get restaurant menu directly from Swiggy API"""
    try:
        data = await SwiggyAPIClient.get_restaurant_menu(restaurantId, lat, lng)
        if "error" in data:
            raise HTTPException(status_code=500, detail=data["error"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Function to fetch restaurant menu data using SwiggyAPIClient
async def get_restaurant_menu(latitude, longitude, restaurant_id):
    """Fetch restaurant menu data using the SwiggyAPIClient"""
    # Use the SwiggyAPIClient to fetch the menu
    data = await SwiggyAPIClient.get_restaurant_menu(restaurant_id, latitude, longitude)
    
    # Handle errors
    if "error" in data:
        return {"error": data["error"]}
    
    # Extract formatted menu data using the helper method
    return SwiggyAPIClient.extract_menu_data(data)

# FastAPI endpoint to get the restaurant menu
@app.post("/restaurant-menu/")
async def get_menu(request: RestaurantRequest):
    """Get restaurant menu for the frontend"""
    # Get restaurant data using SwiggyAPIClient
    restaurant_menu_data = await get_restaurant_menu(
        request.latitude, request.longitude, request.restaurant_id
    )
    
    # Check for errors
    if "error" in restaurant_menu_data:
        raise HTTPException(status_code=500, detail=restaurant_menu_data["error"])
    
    return restaurant_menu_data

# Chatbot API models and endpoints
class MediaData(BaseModel):
    type: str  # e.g., "image"
    data: str  # Base64 encoded data
    metadata: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    location: Optional[Dict[str, float]] = Field(default_factory=lambda: {"latitude": 12.9716, "longitude": 77.5946})
    user_id: Optional[str] = None
    media: Optional[MediaData] = None

# Helper function to track messages in the frontend for UI purposes only
def save_conversation_message(conversation_id: str, user_id: Optional[str], message_type: str, message: str):
    """Save a message to the in-memory conversation store (for UI only)"""
    if conversation_id not in conversations_db:
        conversations_db[conversation_id] = {
            "session_id": conversation_id,
            "user_id": user_id,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    
    # Add the message
    conversations_db[conversation_id]["messages"].append({
        "type": message_type,
        "text": message,
        "timestamp": datetime.now().isoformat()
    })
    
    # Update the last updated timestamp
    conversations_db[conversation_id]["updated_at"] = datetime.now().isoformat()
    
    # Limit to last 10 messages per conversation
    if len(conversations_db[conversation_id]["messages"]) > 20:
        conversations_db[conversation_id]["messages"] = conversations_db[conversation_id]["messages"][-20:]

async def stream_chat_response(message: str, conversation_id: Optional[str], location: Dict[str, float], user_id: Optional[str], media: Optional[MediaData] = None):
    """Generate a streaming response from the chatbot"""
    # Generate conversation ID if not provided
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        
    # Save the user message to conversation history for UI tracking
    save_conversation_message(conversation_id, user_id, "human", message)
    
    # Log location data for debugging
    print(f"Processing message with location data: {location}")
    print(f"[DEBUG TRACE] Starting chat processing for message: {message[:50]}...")

    # Create buffer for directly injecting structured data
    pending_structured_data = []
    last_tool_name = None
    ai_response = ""
    
    # Process the message with the agent (now passing conversation_id to agent)
    async for chunk in chatbot.process_message(
        message=message,
        conversation_id=conversation_id,  # Pass the conversation_id to the agent
        user_id=user_id,
        location=location,
        media=media.dict() if media else None
    ):
        # Add debug logging to trace events
        if isinstance(chunk, dict):
            event_type = chunk.get("type", "unknown")
            print(f"[DEBUG EVENT] Streaming event type: {event_type}")
            
            # Collect the AI's final message
            if event_type == "message" and "data" in chunk:
                ai_response = chunk["data"]
            
            # DIRECT STRUCTURED DATA INJECTION: When we see tool_end events with menu data
            if event_type == "tool_end" and "output" in chunk:
                tool_name = chunk.get("tool_name", "unknown")
                last_tool_name = tool_name
                print(f"[DEBUG TOOL] Tool {tool_name} response received")
                output = chunk.get("output", {})
                
                # Log detailed info for tool responses
                if isinstance(output, dict):
                    if "results" in output:
                        print(f"[DEBUG TOOL] Tool {tool_name} returned {len(output.get('results', []))} results")
                    if "result_type" in output:
                        print(f"[DEBUG TOOL] Tool {tool_name} result type: {output.get('result_type')}")
                    
                    # CRITICAL: Direct structured data extraction for get_restaurant_menu tool
                    if tool_name == "get_restaurant_menu" and "restaurant_info" in output:
                        # Extract restaurant card
                        restaurant_info = output.get("restaurant_info")
                        if restaurant_info:
                            print(f"[DEBUG CRITICAL DIRECT] Extracting restaurant card for direct injection")
                            
                            # Create restaurant card event
                            restaurant_event = {
                                "type": "structured_data",
                                "data": {
                                    "type": "restaurant",
                                    "data": restaurant_info
                                }
                            }
                            
                            # Add to pending structured data - will be sent immediately after this event
                            pending_structured_data.append(restaurant_event)
                            print(f"[DEBUG CRITICAL DIRECT] Added restaurant card to pending structured data")
                        
                        # Extract food items (up to 5 for menu display)
                        if "results" in output and isinstance(output["results"], list):
                            food_items = output["results"][:5]  # Limit to 5 items
                            for item in food_items:
                                if isinstance(item, dict) and "type" in item and item["type"] == "food_item":
                                    print(f"[DEBUG CRITICAL DIRECT] Extracting food item for direct injection")
                                    
                                    # Create food item event (directly use item as is)
                                    food_event = {
                                        "type": "structured_data",
                                        "data": item
                                    }
                                    
                                    # Add to pending structured data
                                    pending_structured_data.append(food_event)
                            
                            print(f"[DEBUG CRITICAL DIRECT] Added {len(food_items)} food items to pending structured data")
                    
                    # CRITICAL: Direct extraction for search_restaurants_direct tool
                    elif tool_name == "search_restaurants_direct" and "results" in output:
                        # Extract restaurant results (up to 3 for display)
                        restaurant_results = output.get("results", [])[:3]  # Limit to 3 restaurants
                        for item in restaurant_results:
                            if isinstance(item, dict):
                                # Check if it's already formatted with type/data
                                if "type" in item and item["type"] == "restaurant" and "data" in item:
                                    print(f"[DEBUG CRITICAL DIRECT] Extracting restaurant result for direct injection")
                                    
                                    # Create restaurant event
                                    restaurant_event = {
                                        "type": "structured_data",
                                        "data": item
                                    }
                                    
                                    # Add to pending structured data
                                    pending_structured_data.append(restaurant_event)
                                    
                        print(f"[DEBUG CRITICAL DIRECT] Added {len(restaurant_results)} restaurant results to pending structured data")
            
            # Extra logging for structured data 
            elif event_type == "structured_data":
                print(f"[DEBUG CRITICAL] Found structured_data event")
                data_type = chunk.get("data", {}).get("type", "unknown") if isinstance(chunk.get("data"), dict) else "unknown"
                print(f"[DEBUG CRITICAL] Structured data type: {data_type}")
        
        # Format each chunk as an SSE event
        formatted_chunk = f"data: {json.dumps(chunk)}\n\n"
        print(f"[DEBUG STREAM] Yielding chunk of type: {chunk.get('type', 'unknown')}")
        yield formatted_chunk
        
        # CRITICAL: After yielding a tool_end event, send any pending structured data
        # This ensures they appear in the stream right after the tool completion
        if isinstance(chunk, dict) and chunk.get("type") == "tool_end" and pending_structured_data:
            print(f"[DEBUG CRITICAL DIRECT] Yielding {len(pending_structured_data)} pending structured data items after tool_end")
            
            # Small delay to ensure proper event ordering
            await asyncio.sleep(0.05)
            
            # Yield each pending structured data item as a separate event
            for data_item in pending_structured_data:
                sd_formatted = f"data: {json.dumps(data_item)}\n\n"
                print(f"[DEBUG CRITICAL DIRECT] Directly yielding structured_data event")
                yield sd_formatted
            
            # Clear the pending data
            pending_structured_data = []
    
    # Save the AI's final message to conversation history
    if ai_response:
        save_conversation_message(conversation_id, user_id, "ai", ai_response)

@app.post("/api/agent/chat/stream")
async def chat_stream(message: ChatMessage):
    """Streaming endpoint for chatbot agent"""
    return StreamingResponse(
        stream_chat_response(
            message=message.message,
            conversation_id=message.conversation_id,
            location=message.location,
            user_id=message.user_id,
            media=message.media
        ),
        media_type="text/event-stream"
    )

@app.post("/api/conversation/history")
async def get_conversation_history(request: ConversationHistoryRequest):
    """Get conversation history for a user"""
    try:
        print("Fetching conversation history with params:", request)
        
        # Filter by user_id if provided
        filtered_conversations = []
        for conv_id, conv in conversations_db.items():
            if request.user_id is None or conv.get("user_id") == request.user_id:
                filtered_conversations.append(conv)
        
        # Sort the conversations
        sort_key = request.sort_by
        if sort_key == "timestamp":
            sort_key = "updated_at"
            
        reverse = request.sort_order == -1  # True for descending
        filtered_conversations.sort(key=lambda c: c.get(sort_key, ""), reverse=reverse)
        
        # Apply pagination
        paginated = filtered_conversations[request.offset:request.offset+request.limit]
        
        # Process the conversations to include summaries and other fields
        for conv in paginated:
            messages = conv.get("messages", [])
            if messages:
                # Create a summary from the first user message
                first_user_msg = next((m for m in messages if m.get("type") == "human"), None)
                if first_user_msg:
                    text = first_user_msg.get("text", "")
                    conv["summary"] = text[:100] + "..." if len(text) > 100 else text
                else:
                    conv["summary"] = "Conversation"
                    
                conv["message_count"] = len(messages)
                
                # Get timestamps for first and last messages
                if messages:
                    conv["start_time"] = messages[0].get("timestamp", conv.get("created_at"))
                    conv["end_time"] = messages[-1].get("timestamp", conv.get("updated_at"))
            else:
                # Default values for empty conversations
                conv["summary"] = "Empty Conversation"
                conv["message_count"] = 0
                conv["start_time"] = conv.get("created_at")
                conv["end_time"] = conv.get("updated_at")
        
        # Return the conversations with pagination info
        return {
            "conversations": paginated,
            "total": len(filtered_conversations),
            "limit": request.limit,
            "offset": request.offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversation/{conversation_id}")
async def get_conversation_detail(conversation_id: str):
    """Get details of a specific conversation"""
    try:
        # Find the conversation
        if conversation_id not in conversations_db:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        conversation = conversations_db[conversation_id]
        
        # Return the conversation details
        return conversation
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Error fetching conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a specific conversation"""
    try:
        # Check if conversation exists
        if conversation_id not in conversations_db:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        # Delete the conversation
        del conversations_db[conversation_id]
        
        # Return success response
        return {"success": True, "message": "Conversation deleted successfully"}
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Run the FastAPI app with Uvicorn when the script is executed directly
if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server for Food Delivery Chatbot...")
    print("Agent initialized with tools for search, order management, and refunds")
    print("Using global window memory with size 10 for conversation history")
    uvicorn.run(app, host="0.0.0.0", port=8000)
