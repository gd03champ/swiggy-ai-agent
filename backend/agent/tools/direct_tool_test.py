#!/usr/bin/env python3
"""
Simple, direct test script for Swiggy AI agent tools
Tests all tools in a straightforward manner as they would be used by LLMs
"""
import asyncio
import json
import sys
import os
from typing import Any, Dict

# Add the project root directory to Python's path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Import all tools directly - now with full paths
from backend.agent.tools.search_tools import search_restaurants, search_restaurants_direct, search_food_items_enhanced, get_restaurant_menu
from backend.agent.tools.order_tools import get_order_details, initiate_refund

# Enhanced print helper with limit and summary
def print_json(data: Any, indent: int = 2, max_items: int = 5) -> None:
    """
    Print JSON data in a readable format with limits
    
    Args:
        data: The data to print
        indent: Indentation level
        max_items: Maximum number of items to print in lists/arrays
    """
    # Handle dictionaries with special consideration for results arrays
    if isinstance(data, dict):
        # Print summary of results if present
        if "results" in data and isinstance(data["results"], list):
            total_results = len(data["results"])
            print(f"Total results: {total_results}")
            
            # Make a copy with limited results for printing
            limited_data = data.copy()
            limited_data["results"] = limited_data["results"][:max_items]
            
            if total_results > max_items:
                print(f"Showing first {max_items} of {total_results} results:")
            
            # Print limited data
            print(json.dumps(limited_data, indent=indent, ensure_ascii=False)[:1000] + "...")
            return
        
        # Handle restaurant menu data specially
        if "menu" in data and isinstance(data["menu"], list):
            menu_categories = len(data["menu"])
            total_items = sum(len(category.get("items", [])) for category in data["menu"])
            
            print(f"Restaurant: {data.get('restaurant_name', 'Unknown')}")
            print(f"Menu has {menu_categories} categories with {total_items} total items")
            print(f"Sample categories: {', '.join(category.get('category', 'Unnamed') for category in data.get('menu', [])[:3])}")
            
            # Print just restaurant info without full menu
            if "restaurant_info" in data:
                print("\nRestaurant info:")
                print(json.dumps(data["restaurant_info"], indent=indent, ensure_ascii=False))
            
            return
            
        # Print general summary for other dict types
        print(f"Dictionary with {len(data)} keys: {', '.join(list(data.keys())[:5])}")
        print(json.dumps(data, indent=indent, ensure_ascii=False)[:1000] + "...")
        
    # Handle lists with limitation
    elif isinstance(data, list):
        total_items = len(data)
        print(f"List with {total_items} items")
        
        if total_items > 0:
            limited_data = data[:max_items]
            
            if total_items > max_items:
                print(f"Showing first {max_items} of {total_items} items:")
            
            print(json.dumps(limited_data, indent=indent, ensure_ascii=False))
    else:
        print(data)

# Main test function - runs tests for all tools
async def test_all_tools():
    """Run tests for all tools in a straightforward manner"""
    # Separator function
    def separator(title: str) -> None:
        print(f"\n{'=' * 80}\n{title}\n{'=' * 80}\n")
    
    separator("TEST: search_restaurants")
    print("Testing search for 'pizza':")
    # Use ainvoke() for async tools
    result = await search_restaurants.ainvoke("pizza")
    print_json(result)
    
    separator("TEST: search_restaurants_direct")
    print("Testing direct search for 'domino':")
    result = await search_restaurants_direct.ainvoke("domino")
    print_json(result)
    
    separator("TEST: search_food_items_enhanced")
    print("Testing enhanced food search for 'soup':")
    result = await search_food_items_enhanced.ainvoke("soup")
    print_json(result)
    
    separator("TEST: get_restaurant_menu")
    print("Testing menu retrieval for restaurant ID '23847' (Domino's Pizza):")
    result = await get_restaurant_menu.ainvoke("23847")
    print_json(result)
    
    separator("TEST: get_order_details")
    print("Testing order details retrieval (note: may fail without valid MongoDB data):")
    try:
        # Use invoke() for sync tools with a string input
        result = get_order_details.invoke("67ca93163269db5c69a4010c")
        print_json(result)
    except Exception as e:
        print(f"Error: {e}")
    
    separator("TEST: initiate_refund")
    print("Testing refund initiation (note: may fail without valid MongoDB data):")
    try:
        # The LangChain tool.invoke() method expects a single input argument,
        # so we need to pass a dictionary containing all parameters
        result = initiate_refund.invoke({
            "order_id": "67ca93163269db5c69a4010c",
            "reason": "Food quality issue - items were cold on delivery",
            "validation_details": "Image confirms food appears cold and congealed"
        })
        print_json(result)
    except Exception as e:
        print(f"Error: {e}")

# Run tests when the script is executed
if __name__ == "__main__":
    print("Starting direct tool tests...\n")
    asyncio.run(test_all_tools())
    print("\nDirect tool tests complete!")
