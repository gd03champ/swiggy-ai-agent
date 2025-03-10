"""
Client for interacting with Swiggy's API
Provides unified access patterns, error handling, and caching
"""
import asyncio
import time
import aiohttp
from typing import Dict, List, Any, Optional, Tuple

class SwiggyAPIClient:
    """
    Client for interacting with Swiggy's API
    Provides unified access patterns, error handling, and caching
    """
    
    BASE_URL = "https://www.swiggy.com/dapi"
    DEFAULT_HEADERS = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    
    # Simple in-memory cache
    _restaurant_cache = {}
    _menu_cache = {}
    _search_cache = {}
    
    @classmethod
    async def get_restaurants(cls, latitude: float, longitude: float, page_type: str = "COLLECTION", 
                            use_cache: bool = True, cache_ttl: int = 300) -> Dict[str, Any]:
        """
        Get restaurant listings from Swiggy API with optional caching
        
        Args:
            latitude: User latitude
            longitude: User longitude
            page_type: Swiggy API page type (COLLECTION, NEW_RESTAURANT, etc.)
            use_cache: Whether to use caching
            cache_ttl: Cache time-to-live in seconds
            
        Returns:
            Restaurant data from API or cached data
        """
        cache_key = f"restaurants:{page_type}:{latitude}:{longitude}"
        
        # Try to get from cache if enabled
        if use_cache and cache_key in cls._restaurant_cache:
            timestamp, data = cls._restaurant_cache[cache_key]
            if time.time() - timestamp < cache_ttl:
                print(f"[DEBUG] Using cached restaurants for {page_type}")
                return data
        
        # Fetch from API
        url = f"{cls.BASE_URL}/restaurants/list/v5?lat={latitude}&lng={longitude}&page_type={page_type}"
        data = await cls._make_request(url)
        
        # Update cache if successful and caching is enabled
        if use_cache and "error" not in data:
            cls._restaurant_cache[cache_key] = (time.time(), data)
        
        return data
    
    @classmethod
    async def search_restaurants(cls, query: str, latitude: float, longitude: float,
                               use_cache: bool = True, cache_ttl: int = 180) -> Dict[str, Any]:
        """
        Search for restaurants by query string
        
        Args:
            query: Search query (restaurant name, cuisine, etc.)
            latitude: User latitude
            longitude: User longitude
            use_cache: Whether to use caching
            cache_ttl: Cache time-to-live in seconds
            
        Returns:
            Search results from API or cached data
        """
        cache_key = f"search:{query}:{latitude}:{longitude}"
        
        # Try to get from cache if enabled
        if use_cache and cache_key in cls._search_cache:
            timestamp, data = cls._search_cache[cache_key]
            if time.time() - timestamp < cache_ttl:
                print(f"[DEBUG] Using cached search results for '{query}'")
                return data
        
        # Fetch from API
        url = f"{cls.BASE_URL}/restaurants/search/v3?lat={latitude}&lng={longitude}&str={query}&trackingId=undefined"
        data = await cls._make_request(url)
        
        # Update cache if successful and caching is enabled
        if use_cache and "error" not in data:
            cls._search_cache[cache_key] = (time.time(), data)
            
        return data
    
    @classmethod
    async def get_restaurant_menu(cls, restaurant_id: str, latitude: float, longitude: float,
                                use_cache: bool = True, cache_ttl: int = 600) -> Dict[str, Any]:
        """
        Get menu for a specific restaurant
        
        Args:
            restaurant_id: Swiggy restaurant ID
            latitude: User latitude
            longitude: User longitude
            use_cache: Whether to use caching
            cache_ttl: Cache time-to-live in seconds
            
        Returns:
            Restaurant menu data from API or cached data
        """
        cache_key = f"menu:{restaurant_id}:{latitude}:{longitude}"
        
        # Try to get from cache if enabled
        if use_cache and cache_key in cls._menu_cache:
            timestamp, data = cls._menu_cache[cache_key]
            if time.time() - timestamp < cache_ttl:
                print(f"[DEBUG] Using cached menu for restaurant {restaurant_id}")
                return data
        
        # Fetch from API
        url = f"{cls.BASE_URL}/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat={latitude}&lng={longitude}&submitAction=ENTER&restaurantId={restaurant_id}"
        data = await cls._make_request(url)
        
        # Update cache if successful and caching is enabled
        if use_cache and "error" not in data:
            cls._menu_cache[cache_key] = (time.time(), data)
            
        return data
        
    @classmethod
    async def _make_request(cls, url: str) -> Dict[str, Any]:
        """
        Make API request with error handling and retry logic
        
        Args:
            url: Full API URL to request
            
        Returns:
            JSON response data or error dictionary
        """
        max_retries = 3
        retry_count = 0
        backoff_factor = 1.5  # Exponential backoff
        
        while retry_count < max_retries:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=cls.DEFAULT_HEADERS, ssl=False) as response:
                        if response.status != 200:
                            if retry_count < max_retries - 1:
                                retry_count += 1
                                wait_time = backoff_factor ** retry_count
                                print(f"[DEBUG] Request failed with status {response.status}, retrying in {wait_time:.1f}s...")
                                await asyncio.sleep(wait_time)
                                continue
                            return {
                                "error": f"API returned status code {response.status}",
                                "message": "Failed to fetch data from Swiggy API"
                            }
                        
                        data = await response.json()
                        
                        # Check for API-level errors
                        if data.get("statusCode", 0) != 0:
                            error_message = data.get("statusMessage", "Unknown API error")
                            
                            # For some search API errors, we might need special handling
                            if url.find("/search/v3") > 0 and data.get("statusCode") == 1:
                                print(f"[DEBUG] Search API error: {error_message}, will use fallback")
                                return {
                                    "error": error_message,
                                    "status_code": data.get("statusCode"),
                                    "needs_fallback": True
                                }
                            
                            return {
                                "error": error_message,
                                "status_code": data.get("statusCode")
                            }
                        
                        return data
                        
            except aiohttp.ClientError as e:
                if retry_count < max_retries - 1:
                    retry_count += 1
                    wait_time = backoff_factor ** retry_count
                    print(f"[DEBUG] Network error: {str(e)}, retrying in {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
                    continue
                return {
                    "error": f"Network error: {str(e)}",
                    "message": "Failed to connect to Swiggy API"
                }
            except Exception as e:
                return {
                    "error": f"Unexpected error: {str(e)}",
                    "message": "An unexpected error occurred while fetching data"
                }
    
    # Helper functions for data extraction
    @staticmethod
    def extract_restaurants_from_response(data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract structured restaurant data from API response"""
        restaurants = []
        
        try:
            # First check for data.cards path (restaurant listing)
            if "data" in data and "cards" in data["data"]:
                # Find all restaurant grid listings
                for card in data["data"]["cards"]:
                    if (isinstance(card, dict) and 
                        "card" in card and 
                        "card" in card["card"] and
                        "@type" in card["card"]["card"] and
                        card["card"]["card"]["@type"] == "type.googleapis.com/swiggy.gandalf.widgets.v2.GridWidget"):
                        
                        # Check for restaurant grid ID or if it contains restaurant info
                        card_data = card["card"]["card"]
                        if "gridElements" in card_data and "infoWithStyle" in card_data["gridElements"]:
                            info_style = card_data["gridElements"]["infoWithStyle"]
                            
                            if "restaurants" in info_style:
                                for rest_item in info_style["restaurants"]:
                                    if "info" in rest_item:
                                        rest_info = rest_item["info"]
                                        restaurant = SwiggyAPIClient.extract_restaurant_data(rest_info)
                                        if restaurant:
                                            restaurants.append(restaurant)
                                        
            # Alternative structure for search API
            elif "data" in data and "restaurants" in data["data"]:
                for rest_info in data["data"]["restaurants"]:
                    if "info" in rest_info:
                        restaurant = SwiggyAPIClient.extract_restaurant_data(rest_info["info"])
                        if restaurant:
                            restaurants.append(restaurant)
                            
        except Exception as e:
            print(f"Error extracting restaurants: {str(e)}")
        
        return restaurants

    @staticmethod
    def extract_restaurant_data(rest_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract consistent restaurant data from restaurant info object"""
        try:
            # Extract delivery time from either direct field or sla object
            delivery_time = "30 min"  # Default
            if "deliveryTime" in rest_info:
                delivery_time = f"{rest_info['deliveryTime']} min"
            elif "sla" in rest_info and "deliveryTime" in rest_info["sla"]:
                delivery_time = f"{rest_info['sla']['deliveryTime']} min"
                
            return {
                "id": rest_info.get("id", ""),
                "name": rest_info.get("name", "Unknown Restaurant"),
                "image_url": rest_info.get("cloudinaryImageId", None),
                "rating": rest_info.get("avgRating", "N/A"),
                "cuisine": ", ".join(rest_info.get("cuisines", [])),
                "delivery_time": delivery_time,
                "cost_for_two": rest_info.get("costForTwo", ""),
                # Add more fields that might be useful
                "veg": rest_info.get("veg", False),
                "location": rest_info.get("areaName", ""),
                "offers": rest_info.get("offers", []),
                "isOpen": rest_info.get("isOpen", True),
            }
        except Exception as e:
            print(f"Error extracting restaurant data: {str(e)}")
            return None
            
    @staticmethod
    def extract_menu_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract structured menu data from API response"""
        try:
            # Extract restaurant information
            restaurant_data = None
            for card in data.get('data', {}).get('cards', []):
                if isinstance(card, dict) and card.get('card', {}).get('@type') == "type.googleapis.com/swiggy.presentation.food.v2.Restaurant":
                    restaurant_data = card.get('card', {}).get('info')
                    break
            
            # Extract menu information
            restaurant_menu = []
            for card in data.get('data', {}).get('cards', []):
                if isinstance(card, dict) and 'groupedCard' in card:
                    for menu_card in card.get('groupedCard', {}).get('cardGroupMap', {}).get('REGULAR', {}).get('cards', []):
                        if isinstance(menu_card, dict) and menu_card.get('card', {}).get('card', {}).get('@type') == "type.googleapis.com/swiggy.presentation.food.v2.ItemCategory":
                            category = menu_card.get('card', {}).get('card')
                            if category:
                                restaurant_menu.append(category)
            
            # Format response for frontend
            formatted_menu = []
            
            for category in restaurant_menu:
                category_name = category.get('title', 'Uncategorized')
                items = []
                
                for item_card in category.get('itemCards', []):
                    item_info = item_card.get('card', {}).get('info', {})
                    if item_info:
                        items.append({
                            "name": item_info.get('name', 'Unknown Item'),
                            "description": item_info.get('description', ''),
                            "price": item_info.get('price', 0) / 100,  # Convert from paise to rupees
                            "image_url": item_info.get('imageId', None)  # This is a Cloudinary ID, not a full URL
                        })
                
                if items:
                    formatted_menu.append({
                        "category": category_name,
                        "items": items
                    })
            
            return {
                "restaurant_name": restaurant_data.get('name', 'Unknown Restaurant') if restaurant_data else 'Unknown Restaurant',
                "cuisines": restaurant_data.get('cuisines', []) if restaurant_data else [],
                "rating": restaurant_data.get('avgRating', 'N/A') if restaurant_data else 'N/A',
                "menu": formatted_menu
            }
                
        except Exception as e:
            print(f"Error extracting menu data: {str(e)}")
            return {"error": f"Error extracting menu data: {str(e)}"}
