"""
Search-related tools for the LangChain agent
Uses the SwiggyAPIClient for consistent API access
"""
import time
import json
from typing import Dict, List, Any, Optional

from langchain_core.tools import tool
from pymongo import MongoClient

# Import the SwiggyAPIClient
from backend.services.swiggy_api_client import SwiggyAPIClient

# MongoDB setup for user preferences
client = MongoClient("mongodb://localhost:27017/")
db = client["restaurant_db"]
user_prefs_collection = db["user_preferences"]

# Map categories to page types used by Swiggy API
category_map = {
    "recommended": "COLLECTION",
    "top": "COLLECTION",
    "popular": "COLLECTION",
    "best": "COLLECTION",
    "new": "NEW_RESTAURANT",
    "nearest": "SEO_RESTAURANT_LISTING",
    "default": "COLLECTION"
}

@tool
async def search_restaurants(query: str) -> Dict[str, Any]:
    """
    ONLY use this tool to search for restaurants by category or collection.
    DO NOT use this tool for food item searches - use search_food_items instead.
    
    Examples:
    - "Show me popular restaurants"
    - "Find Italian restaurants"
    - "Top rated places to eat"
    
    Args:
        query: Category to browse (e.g., "popular", "nearest", "top rated") or restaurant type ("Italian", "Chinese")
        
    Returns:
        List of matching restaurants
    """
    # Default coordinates for Bangalore
    latitude = 12.9716
    longitude = 77.5946
    user_id = None
    
    # Treat the input as a category
    category = query
    
    # Debug location data
    print(f"[DEBUG] Browsing restaurants in category: {category} at lat={latitude}, lng={longitude}")
    
    # Set page type based on category
    page_type = category_map.get(category.lower(), "COLLECTION")
    
    try:
        # Use the SwiggyAPIClient to get restaurant data
        data = await SwiggyAPIClient.get_restaurants(latitude, longitude, page_type)
        
        # Handle API errors
        if "error" in data:
            return {
                "message": f"Error fetching restaurants: {data['error']}",
                "suggestions": ["Please try again later", "Try with a different category"]
            }
        
        # Extract restaurants using the helper method
        restaurants = SwiggyAPIClient.extract_restaurants_from_response(data)
        
        # Format the results for our frontend
        results = []
        for restaurant in restaurants:
            results.append({
                "type": "restaurant",
                "data": restaurant
            })
        
        # Update user preferences if user_id is provided
        if user_id:
            user_prefs_collection.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"categories_viewed": category},
                    "$set": {"last_location": {"latitude": latitude, "longitude": longitude}}
                },
                upsert=True
            )
        
        # Return the results with helpful message if empty
        if not results:
            return {
                "message": f"No restaurants found in the '{category}' category",
                "suggestions": ["Try a different category like 'popular' or 'recommended'", 
                               "Try searching for specific restaurants using search_restaurants_direct",
                               "Check if the location coordinates are correct"]
            }
        
        return {"results": results}
            
    except Exception as e:
        print(f"Error in search_restaurants: {str(e)}")
        return {
            "message": f"Error searching restaurant category: {str(e)}",
            "suggestions": ["Please try again later", "Try with a different category"]
        }

@tool
async def search_restaurants_direct(query: str) -> Dict[str, Any]:
    """
    Directly search for restaurants by name, cuisine, or dish. Best for specific searches like "pizza delivery" or "Domino's".
    
    Args:
        query: Search query (restaurant name, dish name, cuisine type, etc.)
        
    Returns:
        List of restaurants matching the search query
    """
    # Default coordinates for Bangalore
    latitude = 12.9716
    longitude = 77.5946
    user_id = None
    
    # Debug location data
    print(f"[DEBUG] Direct searching restaurants with query: '{query}' at lat={latitude}, lng={longitude}")
    
    try:
        # Use SwiggyAPIClient for search
        data = await SwiggyAPIClient.search_restaurants(query, latitude, longitude)
        
        # Handle errors and fallback to regular search if needed
        if "error" in data:
            if data.get("needs_fallback"):
                print(f"[DEBUG] Search API error, falling back to regular listing")
                
                # Use regular listing as fallback
                fallback_data = await SwiggyAPIClient.get_restaurants(latitude, longitude, "COLLECTION")
                
                if "error" in fallback_data:
                    return {
                        "message": f"Error searching for restaurants: {fallback_data['error']}",
                        "suggestions": ["Please try again later", "Try with a different search term"]
                    }
                    
                # Extract restaurants from fallback data
                restaurants = SwiggyAPIClient.extract_restaurants_from_response(fallback_data)
            else:
                # Return error if there's no fallback option
                return {
                    "message": f"Error searching for restaurants: {data['error']}",
                    "suggestions": ["Please try again later", "Try with a different search term"]
                }
        else:
            # Extract restaurants from search response
            restaurants = SwiggyAPIClient.extract_restaurants_from_response(data)[:5] # Filter only 5 restaurants for chat
        
        # Format the results for our frontend
        results = []
        for restaurant in restaurants:
            results.append({
                "type": "restaurant",
                "data": restaurant
            })
        
        # Update user preferences if user_id is provided
        if user_id:
            user_prefs_collection.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"search_queries": query},
                    "$set": {"last_location": {"latitude": latitude, "longitude": longitude}}
                },
                upsert=True
            )
        
        # Return the results with helpful message if empty
        if not results:
            return {
                "message": f"No restaurants found matching '{query}'",
                "suggestions": ["Try a more general search term", 
                               "Try browsing by category with search_restaurants",
                               "Try searching for a cuisine type like 'Italian' or 'Indian'"]
            }
        
        return {"results": results}
                
    except Exception as e:
        print(f"Error in search_restaurants_direct: {str(e)}")
        return {
            "message": f"Error searching for restaurants: {str(e)}",
            "suggestions": ["Please try again later", "Try with a different search term"]
        }

@tool
async def search_food_items(query: str) -> Dict[str, Any]:
    """
    ONLY use this tool to search for specific food dishes or menu items.
    DO NOT use for restaurant searches - use search_restaurants instead.
    
    Examples:
    - "Find butter chicken dishes"
    - "Search for pizza"
    - "Show me biryani options"
    
    Args:
        query: Food item name (e.g., "butter chicken", "pizza", "biryani")
        
    Returns:
        List of matching food items from various restaurants
    """
    # Default values
    latitude = 12.9716
    longitude = 77.5946
    user_id = None
    
    print(f"[DEBUG] Searching food items with query: {query}")
    query_lower = query.lower()
    results = []
    
    try:
        # Direct food search approach - search for the query directly using SwiggyAPIClient
        search_data = await SwiggyAPIClient.search_restaurants(query, latitude, longitude)
        
        if "error" in search_data and search_data.get("needs_fallback", False):
            # Use fallback search if direct search fails
            search_data = await SwiggyAPIClient.get_restaurants(latitude, longitude, "COLLECTION")
        
        # Extract restaurant IDs from the search results that potentially match our food
        restaurant_ids = []
        restaurants_map = {}  # To store restaurant name by ID
        
        if "error" not in search_data:
            # Extract restaurants from search response
            restaurants = SwiggyAPIClient.extract_restaurants_from_response(search_data)
            # Take only first 5 restaurants to limit API calls
            restaurants = restaurants[:5]
            
            for restaurant in restaurants:
                if "id" in restaurant:
                    restaurant_ids.append(restaurant["id"])
                    restaurants_map[restaurant["id"]] = restaurant.get("name", "Unknown Restaurant")
        
        # Search for matching food items in extracted restaurants
        for rest_id in restaurant_ids:
            try:
                # Get restaurant's menu
                restaurant_menu = await get_restaurant_menu(rest_id)
                
                if "error" in restaurant_menu:
                    print(f"Error fetching menu for restaurant {rest_id}: {restaurant_menu.get('error')}")
                    continue
                
                restaurant_name = restaurant_menu.get("restaurant_name", restaurants_map.get(rest_id, "Unknown Restaurant"))
                
                # Extract food items that match the query
                for category in restaurant_menu.get("menu", []):
                    category_name = category.get("category", "")
                    for item in category.get("items", []):
                        if (query_lower in item.get("name", "").lower() or 
                            query_lower in item.get("description", "").lower()):
                            # Format food item image URL if it's a Cloudinary ID
                            image_url = item.get("image_url")
                            
                            # Process Cloudinary image ID if present (but not already a URL)
                            if image_url and isinstance(image_url, str) and not image_url.startswith('http'):
                                image_url = f"https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/{image_url}"
                                
                            results.append({
                                "type": "food_item",  # IMPORTANT: Changed type to food_item
                                "data": {
                                    "name": item.get("name"),
                                    "description": item.get("description", ""),
                                    "price": item.get("price"),
                                    "image_url": image_url,
                                    "restaurant_name": restaurant_name,
                                    "restaurant_id": rest_id,
                                    "category": category_name
                                }
                            })
            except Exception as e:
                print(f"Error processing menu for restaurant {rest_id}: {str(e)}")
                continue
        
        # Update user preferences if user_id is provided
        if user_id:
            user_prefs_collection.update_one(
                {"user_id": user_id},
                {"$addToSet": {"food_preferences": query}},
                upsert=True
            )
        
        # Return the results
        if not results:
            return {
                "message": f"No food items found matching '{query}'",
                "suggestions": ["Try a broader search term", 
                               "Try a different food category like 'pizza' or 'burger'", 
                               "Try searching for a specific dish"]
            }
        
        # Add metadata to help with multi-step reasoning
        unique_restaurants = set()
        restaurant_map = {}
        
        for result in results:
            if "data" in result:
                rest_id = result["data"].get("restaurant_id")
                rest_name = result["data"].get("restaurant_name", "Unknown Restaurant")
                if rest_id:
                    unique_restaurants.add(rest_id)
                    restaurant_map[rest_id] = rest_name
        
        # Return explicitly typed food_item results with metadata
        return {
            "results": results, 
            "result_type": "food_items",
            "metadata": {
                "restaurant_count": len(unique_restaurants),
                "found_in_restaurants": [
                    {"id": rest_id, "name": restaurant_map[rest_id]}
                    for rest_id in unique_restaurants
                ],
                "food_item_count": len(results)
            }
        }
            
    except Exception as e:
        print(f"Error in search_food_items: {str(e)}")
        return {
            "message": f"Error searching for food items: {str(e)}",
            "suggestions": ["Please try again later", "Try with a different search term"]
        }

@tool
async def get_restaurant_menu(restaurant_id: str) -> Dict[str, Any]:
    """
    Get the menu for a specific restaurant.
    
    Args:
        restaurant_id: ID of the restaurant
        
    Returns:
        Restaurant menu data with properly structured food items
    """
    # Default coordinates for Bangalore
    latitude = 12.9716
    longitude = 77.5946
    
    try:
        # Use SwiggyAPIClient to fetch menu data
        data = await SwiggyAPIClient.get_restaurant_menu(restaurant_id, latitude, longitude)
        
        # Handle errors
        if "error" in data:
            return {
                "error": data["error"],
                "message": data.get("message", "Failed to fetch restaurant menu")
            }
        
        # Use the helper method to extract formatted menu data
        menu_data = SwiggyAPIClient.extract_menu_data(data)
        
        # Convert menu data to properly structured format with individual food item cards
        results = []
        restaurant_name = menu_data.get("restaurant_name", "Restaurant")
        
        # Create a restaurant card
        restaurant_info = {
            "name": restaurant_name,
            "id": restaurant_id,
            "cuisines": menu_data.get("cuisines", []),
            "rating": menu_data.get("rating", "N/A")
        }
        
        # Add restaurant card as a structured data item
        results.append({
            "type": "restaurant",
            "data": restaurant_info
        })
        
        # Add featured items (first few items from first category)
        featured_items = []
        if menu_data.get("menu") and len(menu_data["menu"]) > 0:
            first_category = menu_data["menu"][0]
            if first_category.get("items") and len(first_category["items"]) > 0:
                featured_items = first_category["items"][:3]  # Take first 3 items
        
        # Format menu data
        food_items = []
        for category in menu_data.get("menu", []):
            category_name = category.get("category", "")
            for item in category.get("items", []):
                            # Add restaurant context to each food item
                            # Make sure image_url is properly formatted for Cloudinary
                            image_url = item.get("image_url")
                            
                            # Process Cloudinary image ID if present (but not already a URL)
                            if image_url and isinstance(image_url, str) and not image_url.startswith('http'):
                                image_url = f"https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/{image_url}"
                            
                            food_item = {
                                "type": "food_item",
                                "data": {
                                    "name": item.get("name"),
                                    "description": item.get("description", ""),
                                    "price": item.get("price"),
                                    "image_url": image_url,
                                    "restaurant_name": restaurant_name,
                                    "restaurant_id": restaurant_id,
                                    "category": category_name
                                }
                            }
                            food_items.append(food_item)
        
        # Format the output for better structured data handling
        result = {
            "restaurant_name": restaurant_name,
            "restaurant_id": restaurant_id,
            "restaurant_info": restaurant_info,
            "featured_items": featured_items,
            "menu": menu_data.get("menu", []),
            "results": food_items,  # Include formatted food items as results array
            "result_type": "menu"   # Mark this as menu type for the callbacks handler
        }
        
        # CRITICAL DEBUG: Print the full result structure that we're returning
        print(f"[DEBUG CRITICAL] get_restaurant_menu returning restaurant_info: {json.dumps(restaurant_info)[:200]}...")
        print(f"[DEBUG CRITICAL] get_restaurant_menu returning {len(food_items)} food items")
        if food_items:
            print(f"[DEBUG CRITICAL] First food item: {json.dumps(food_items[0] if food_items else {})[:200]}...")
        
        # Return structured data in the format expected by callbacks.py
        return result
                
    except Exception as e:
        print(f"Error in get_restaurant_menu: {str(e)}")
        return {"error": "Error fetching restaurant menu", "message": str(e)}
