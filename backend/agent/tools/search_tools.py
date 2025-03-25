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
from ...services.swiggy_api_client import SwiggyAPIClient

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

# Common cuisines associated with popular food items 
# This helps the enhanced search tool know which cuisines to check
food_cuisine_mapping = {
    "soup": ["Chinese", "North Indian", "Continental"],
    "pizza": ["Italian", "Fast Food"],
    "burger": ["Fast Food", "American"],
    "biryani": ["North Indian", "Mughlai", "Hyderabadi"],
    "noodles": ["Chinese", "Pan-Asian", "Thai"],
    "pasta": ["Italian", "Continental"],
    "sandwich": ["Fast Food", "Cafe", "Healthy Food"],
    "cake": ["Bakery", "Desserts"],
    "ice cream": ["Desserts", "Ice Cream"],
    "coffee": ["Cafe", "Beverages"],
    "tea": ["Beverages", "Cafe"],
    "salad": ["Healthy Food", "Continental"],
    "wrap": ["Fast Food", "Healthy Food"],
    "rolls": ["Fast Food", "North Indian"],
    "momos": ["Chinese", "Tibetan"],
    "dosa": ["South Indian"],
    "idli": ["South Indian"],
    "thali": ["North Indian", "South Indian"],
    "samosa": ["North Indian", "Snacks"],
    "kebab": ["North Indian", "Mughlai"],
    "curry": ["North Indian", "South Indian"],
    "dal": ["North Indian", "Home Food"],
    "paratha": ["North Indian", "Breakfast"],
    "default": ["North Indian", "South Indian", "Chinese", "Fast Food", "Continental"]
}

# Related food terms mapping for expanded keyword matching
# These are common alternate names or specific varieties of the main food
related_food_terms = {
    "soup": ["broth", "shorba", "stew", "chowder", "bisque", "hot and sour", "manchow", 
             "tomato", "sweet corn", "rasam", "pepper", "noodle soup", "wonton", "creamy"],
    "pizza": ["margherita", "pepperoni", "cheese", "paneer", "marinara", "sicilian", 
              "napoletana", "flatbread", "garlic bread"],
    "burger": ["hamburger", "cheeseburger", "veggie burger", "patty", "bun", "aloo tikki"],
    "biryani": ["pulao", "dum biryani", "hyderabadi", "lucknowi", "rice"],
    "noodles": ["hakka", "chow mein", "lo mein", "ramen", "udon", "pasta", "maggi"],
    "ice cream": ["gelato", "frozen", "sundae", "cone", "scoop", "kulfi"],
    "coffee": ["espresso", "cappuccino", "latte", "americano", "mocha", "frappe"],
    "tea": ["chai", "green tea", "black tea", "masala", "herbal", "iced tea"],
    "default": []
}

# Sample fallback items for common food categories when no matches are found
# These provide reasonable defaults to show users even when the search fails
fallback_items = {
    "soup": [
        {"name": "Tomato Soup", "description": "Classic tomato soup made with fresh tomatoes, herbs and cream.", "price": 149.00},
        {"name": "Sweet Corn Soup", "description": "A creamy blend of corn kernels in vegetable stock.", "price": 159.00},
        {"name": "Hot and Sour Soup", "description": "Spicy and tangy soup with vegetables and tofu.", "price": 169.00},
        {"name": "Manchow Soup", "description": "Spicy and hot soup with vegetables and noodles.", "price": 179.00}
    ],
    "pizza": [
        {"name": "Margherita Pizza", "description": "Classic pizza with tomato sauce, mozzarella cheese and basil.", "price": 249.00},
        {"name": "Pepperoni Pizza", "description": "Pizza topped with pepperoni slices and cheese.", "price": 349.00}
    ],
    "burger": [
        {"name": "Veg Burger", "description": "Vegetable patty with lettuce, tomato and cheese in a soft bun.", "price": 129.00},
        {"name": "Chicken Burger", "description": "Grilled chicken patty with lettuce and special sauce.", "price": 169.00}
    ],
    "default": [
        {"name": "Popular Dish", "description": "A highly rated dish from this restaurant.", "price": 199.00}
    ]
}

@tool
async def search_restaurants(query: str) -> Dict[str, Any]:
    """
    ONLY use this tool to search for restaurants by category or collection.
    DO NOT use this tool for food item searches - use search_food_items_enhanced instead.
    
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
        
        # Limit to 10 restaurants to prevent token limit issues
        restaurants = restaurants[:10]
        
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
            restaurants = SwiggyAPIClient.extract_restaurants_from_response(data)[:10] # Limit to 10 restaurants
        
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
async def search_food_items_enhanced(query: str) -> Dict[str, Any]:
    """
    Enhanced search for food items across restaurants. Efficiently finds dishes 
    matching your query using a systematic approach with loop detection.
    
    ONLY use this tool to search for specific food dishes or menu items.
    
    Examples:
    - "Find soup near me"
    - "Search for pizza"
    - "Show me biryani options"
    
    Args:
        query: Food item name (e.g., "soup", "pizza", "biryani")
        
    Returns:
        Dictionary containing matching food items grouped by restaurant,
        with relevance scores and search metadata
    """
    # Default values
    latitude = 12.9716
    longitude = 77.5946
    user_id = None
    searched_cuisines = set()
    
    print(f"[DEBUG] Enhanced food search with query: {query}")
    query_lower = query.lower().strip()
    search_term = query_lower
    
    # Initialize tracking structures for loop detection
    searched_terms = set([search_term])
    searched_restaurant_ids = set()
    results = []
    
    # Extract key words for search (removing common words)
    stop_words = {"a", "an", "the", "for", "with", "near", "me", "best", "good", "top", "nearby"}
    keywords = [word for word in search_term.split() if word not in stop_words]
    main_keyword = keywords[0] if keywords else search_term
    
    # Get related terms for the food item to expand search
    related_terms = []
    for food_term, terms in related_food_terms.items():
        if food_term in search_term:
            related_terms = terms
            break
    
    if not related_terms and main_keyword in related_food_terms:
        related_terms = related_food_terms[main_keyword]
    
    # If no specific related terms found, use empty list
    if not related_terms:
        related_terms = related_food_terms.get("default", [])
    
    # Determine cuisines to search based on the food item
    cuisines_to_search = []
    
    # Find matching cuisine from our mapping
    for food_term, cuisines in food_cuisine_mapping.items():
        if food_term in search_term:
            cuisines_to_search = cuisines
            break
    
    # If no specific cuisines found, use default cuisines
    if not cuisines_to_search:
        cuisines_to_search = food_cuisine_mapping["default"]
    
    # Track relevance scoring
    relevance_scores = {}
    
    try:
        print(f"[DEBUG] Step 1: Direct search for '{search_term}'")
        # STEP 1: Direct search using the exact query
        search_data = await SwiggyAPIClient.search_restaurants(search_term, latitude, longitude)
        
        if "error" in search_data and search_data.get("needs_fallback", False):
            print(f"[DEBUG] Search API error: Using fallback collection search")
            # Use fallback search if direct search fails
            search_data = await SwiggyAPIClient.get_restaurants(latitude, longitude, "COLLECTION")
        
        # Extract restaurants from search response
        restaurants = []
        if "error" not in search_data:
            restaurants = SwiggyAPIClient.extract_restaurants_from_response(search_data)
            # Limit to top 5 restaurants to prevent excessive API calls
            restaurants = restaurants[:5]
        
        # Process found restaurants
        print(f"[DEBUG] Found {len(restaurants)} restaurants in direct search")
        for restaurant in restaurants:
            if "id" in restaurant:
                rest_id = restaurant["id"]
                
                # Skip if we've already searched this restaurant
                if rest_id in searched_restaurant_ids:
                    print(f"[DEBUG] Skipping already searched restaurant: {rest_id}")
                    continue
                
                # Mark as searched to prevent loops
                searched_restaurant_ids.add(rest_id)
                
                try:
                    # Get restaurant menu
                    print(f"[DEBUG] Checking menu for restaurant {rest_id}")
                    restaurant_menu = await get_restaurant_menu.ainvoke(rest_id)
                    
                    if "error" in restaurant_menu:
                        print(f"[DEBUG] Error fetching menu: {restaurant_menu.get('error')}")
                        continue
                    
                    # Get restaurant name
                    restaurant_name = restaurant_menu.get("restaurant_name", restaurant.get("name", "Unknown Restaurant"))
                    
                    # Extract matching food items
                    found_items = []
                    for category in restaurant_menu.get("menu", []):
                        category_name = category.get("category", "")
                        
                        for item in category.get("items", []):
                            item_name = item.get("name", "").lower()
                            item_desc = item.get("description", "").lower() if item.get("description") else ""
                            
                            # Calculate relevance score with expanded matching criteria
                            relevance = 0
                            
                            # Direct matches in name (highest priority)
                            if search_term == item_name:
                                relevance += 15  # Exact full name match
                            elif search_term in item_name:
                                relevance += 10  # Substring match in name
                            elif main_keyword in item_name:
                                relevance += 8   # Main keyword in name
                                
                            # Check for any related terms in the name
                            for term in related_terms:
                                if term in item_name:
                                    relevance += 6   # Related term in name
                                    break
                            
                            # Check for keyword matches in name
                            if any(kw in item_name for kw in keywords):
                                relevance += 5   # Any keyword in name
                                
                            # Check description
                            if search_term in item_desc:
                                relevance += 4   # Search term in description
                            elif main_keyword in item_desc:
                                relevance += 3   # Main keyword in description
                                
                            # Check for any related terms in the description
                            for term in related_terms:
                                if term in item_desc:
                                    relevance += 2   # Related term in description
                                    break
                                    
                            # Check categories - some restaurants put soup types in category names
                            if search_term in category_name.lower():
                                relevance += 5   # Search term in category
                                
                            # Check for partial matches (e.g., "soup" in "Noodle Soup")
                            if item_name.split() and search_term in [part.lower() for part in item_name.split()]:
                                relevance += 7   # Word boundary match
                            
                            # Only include items with some relevance
                            if relevance > 0:
                                # Format food item image URL
                                image_url = item.get("image_url")
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
                                        "restaurant_id": rest_id,
                                        "category": category_name,
                                        "relevance_score": relevance,
                                        "match_type": "direct" if relevance >= 8 else "partial"
                                    }
                                }
                                
                                found_items.append(food_item)
                                
                                # Store for global sorting
                                item_id = f"{rest_id}:{item.get('name')}"
                                relevance_scores[item_id] = relevance
                    
                    # Add found items to results
                    results.extend(found_items)
                    print(f"[DEBUG] Found {len(found_items)} matching items in restaurant {restaurant_name}")
                    
                    # Early stopping: If we found more than 3 good matches, we can stop
                    if len([item for item in found_items if relevance_scores.get(f"{rest_id}:{item['data']['name']}", 0) >= 8]) >= 3:
                        print(f"[DEBUG] Found enough high-quality matches, stopping early")
                        break
                        
                except Exception as e:
                    print(f"[DEBUG] Error processing restaurant {rest_id}: {e}")
        
        # STEP 2: If we didn't find enough results, search by cuisine
        if len(results) < 3:
            print(f"[DEBUG] Step 2: Searching by cuisines {cuisines_to_search}")
            
            for cuisine in cuisines_to_search[:3]:  # Search up to 3 cuisines
                if cuisine in searched_cuisines:
                    continue
                    
                searched_cuisines.add(cuisine)
                print(f"[DEBUG] Searching for {cuisine} restaurants")
                
                try:
                    # Search for restaurants of this cuisine
                    cuisine_search_data = await SwiggyAPIClient.search_restaurants(cuisine, latitude, longitude)
                    
                    if "error" in cuisine_search_data:
                        print(f"[DEBUG] Error searching {cuisine} restaurants")
                        continue
                    
                    cuisine_restaurants = SwiggyAPIClient.extract_restaurants_from_response(cuisine_search_data)
                    cuisine_restaurants = cuisine_restaurants[:3]  # Limit to top 3
                    
                    # Check each restaurant's menu
                    for restaurant in cuisine_restaurants:
                        if "id" in restaurant:
                            rest_id = restaurant["id"]
                            
                            # Skip if already searched
                            if rest_id in searched_restaurant_ids:
                                continue
                                
                            searched_restaurant_ids.add(rest_id)
                            
                            try:
                                # Get menu
                                restaurant_menu = await get_restaurant_menu.ainvoke(rest_id)
                                
                                if "error" in restaurant_menu:
                                    continue
                                
                                restaurant_name = restaurant_menu.get("restaurant_name", restaurant.get("name", "Unknown Restaurant"))
                                
                                # Check menu for matching items including related terms
                                cuisine_items = []
                                for category in restaurant_menu.get("menu", []):
                                    category_name = category.get("category", "")
                                    
                                    for item in category.get("items", []):
                                        item_name = item.get("name", "").lower()
                                        item_desc = item.get("description", "").lower() if item.get("description") else ""
                                        
                                        # Calculate relevance score with expanded criteria
                                        relevance = 0
                                        
                                        # Direct matches in name (highest priority)
                                        if search_term == item_name:
                                            relevance += 15  # Exact match
                                        elif search_term in item_name:
                                            relevance += 10  # Substring match
                                        elif main_keyword in item_name:
                                            relevance += 8   # Main keyword
                                        
                                        # Check for related terms in name
                                        for term in related_terms:
                                            if term in item_name:
                                                relevance += 6   # Related term in name
                                                break
                                        
                                        # Check for keyword matches
                                        if any(kw in item_name for kw in keywords):
                                            relevance += 5   # Any keyword
                                            
                                        # Check description
                                        if search_term in item_desc:
                                            relevance += 4   # Search term in description
                                        elif main_keyword in item_desc:
                                            relevance += 3   # Main keyword in description
                                            
                                        # Check for related terms in description
                                        for term in related_terms:
                                            if term in item_desc:
                                                relevance += 2   # Related term in description
                                                break
                                                
                                        # Check category name
                                        if search_term in category_name.lower():
                                            relevance += 5   # Search term in category
                                            
                                        # Only include items with some relevance
                                        if relevance > 0:
                                            # Format image URL
                                            image_url = item.get("image_url")
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
                                                    "restaurant_id": rest_id,
                                                    "category": category_name,
                                                    "relevance_score": relevance,
                                                    "match_type": "direct" if relevance >= 8 else "partial"
                                                }
                                            }
                                            
                                            cuisine_items.append(food_item)
                                            
                                            # Store for global sorting
                                            item_id = f"{rest_id}:{item.get('name')}"
                                            relevance_scores[item_id] = relevance
                                
                                # Add found items to results
                                results.extend(cuisine_items)
                                print(f"[DEBUG] Found {len(cuisine_items)} matching items in {cuisine} restaurant {restaurant_name}")
                                
                                # Early stopping for cuisine search as well
                                if len([item for item in cuisine_items if relevance_scores.get(f"{rest_id}:{item['data']['name']}", 0) >= 8]) >= 3:
                                    print(f"[DEBUG] Found enough high-quality matches in cuisine search, stopping early")
                                    break
                            except Exception as e:
                                print(f"[DEBUG] Error processing restaurant {rest_id}: {e}")
                                
                except Exception as e:
                    print(f"[DEBUG] Error searching {cuisine} restaurants: {e}")
        
        # STEP 3: Sort results by relevance and organize by restaurant
        print(f"[DEBUG] Step 3: Organizing results by relevance")
        
        # Group results by restaurant
        restaurants_with_items = {}
        for item in results:
            if "data" in item:
                rest_id = item["data"].get("restaurant_id")
                rest_name = item["data"].get("restaurant_name", "Unknown Restaurant")
                
                if rest_id not in restaurants_with_items:
                    restaurants_with_items[rest_id] = {
                        "name": rest_name,
                        "items": []
                    }
                
                # Add relevance score to item for easier sorting
                relevance = item["data"].get("relevance_score", 0)
                item["data"]["relevance_score"] = relevance
                
                restaurants_with_items[rest_id]["items"].append(item)
        
        # Sort items within each restaurant by relevance
        for rest_id, restaurant_data in restaurants_with_items.items():
            restaurant_data["items"].sort(
                key=lambda item: item["data"].get("relevance_score", 0),
                reverse=True
            )
        
        # If no results were found, provide fallback results for common food categories
        if not results:
            print(f"[DEBUG] No results found, checking if fallback items available for {search_term}")
            fallback_category = None
            
            # Find matching fallback category
            for category in fallback_items:
                if category in search_term:
                    fallback_category = category
                    break
            
            # If no direct match, try with main keyword
            if not fallback_category and main_keyword in fallback_items:
                fallback_category = main_keyword
            
            # If we have fallback items for this category
            if fallback_category:
                print(f"[DEBUG] Providing fallback items for {fallback_category}")
                fallback_dishes = fallback_items.get(fallback_category, fallback_items["default"])
                
                # Create artificial restaurant for fallback items
                fallback_rest_id = "fallback_restaurant"
                fallback_rest_name = f"Suggested {fallback_category.title()} dishes"
                
                # Add each fallback item
                for item in fallback_dishes:
                    food_item = {
                        "type": "food_item",
                        "data": {
                            "name": item.get("name"),
                            "description": item.get("description", ""),
                            "price": item.get("price"),
                            "image_url": "",  # No image for fallback items
                            "restaurant_name": fallback_rest_name,
                            "restaurant_id": fallback_rest_id,
                            "category": f"{fallback_category.title()} Dishes",
                            "relevance_score": 5,  # Medium relevance
                            "match_type": "suggested"
                        }
                    }
                    results.append(food_item)
                
                # Add to restaurant mapping
                restaurants_with_items[fallback_rest_id] = {
                    "name": fallback_rest_name,
                    "items": results
                }
                
                return {
                    "results": results,
                    "result_type": "food_items_enhanced",
                    "restaurants": [
                        {
                            "id": fallback_rest_id,
                            "name": fallback_rest_name,
                            "items": results
                        }
                    ],
                    "search_metadata": {
                        "search_term": search_term,
                        "cuisines_searched": list(searched_cuisines),
                        "restaurants_searched": len(searched_restaurant_ids),
                        "total_items_found": len(results),
                        "using_fallback": True
                    },
                    "message": f"No exact matches found for '{query}', showing suggested {fallback_category} options"
                }
            else:
                # No results and no fallback available
                return {
                    "message": f"No food items found matching '{query}'",
                    "search_metadata": {
                        "search_term": search_term,
                        "cuisines_searched": list(searched_cuisines),
                        "restaurants_searched": len(searched_restaurant_ids),
                        "total_items_found": 0
                    },
                    "suggestions": [
                        "Try a broader search term",
                        "Try a different food category like 'pizza' or 'burger'",
                        "Try searching for a specific dish"
                    ]
                }
        
        # Limit total results to 20 items to prevent token limit issues
        results = results[:20]
        
        # Return organized results with metadata
        return {
            "results": results,
            "result_type": "food_items_enhanced",
            "restaurants": [
                {
                    "id": rest_id,
                    "name": data["name"],
                    "items": data["items"][:3]  # Limit to top 3 items per restaurant
                }
                for rest_id, data in restaurants_with_items.items()
            ],
            "search_metadata": {
                "search_term": search_term,
                "cuisines_searched": list(searched_cuisines),
                "restaurants_searched": len(searched_restaurant_ids),
                "total_items_found": len(results)
            }
        }
            
    except Exception as e:
        print(f"[DEBUG] Error in search_food_items_enhanced: {str(e)}")
        import traceback
        traceback.print_exc()
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
        
        # Format menu data - limit to 20 items total across all categories
        food_items = []
        item_count = 0
        for category in menu_data.get("menu", []):
            if item_count >= 20:
                break
                
            category_name = category.get("category", "")
            for item in category.get("items", []):
                if item_count >= 20:
                    break
                    
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
                item_count += 1
        
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
