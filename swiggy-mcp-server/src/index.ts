#!/usr/bin/env node

/**
 * Swiggy MCP Server
 * Provides Swiggy API tools for food and restaurant search
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import Swiggy API client and constants
import { SwiggyAPIClient } from "./swiggy-api.js";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE, categoryMap } from "./constants.js";

// Tool schemas
const searchRestaurantsTool = {
  name: "search_restaurants",
  description: "Search for restaurants by category or collection (popular, top-rated, cuisine type)",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Category to browse (e.g., \"popular\", \"nearest\", \"Italian\")"
      }
    },
    required: ["query"]
  }
};

const searchRestaurantsDirectTool = {
  name: "search_restaurants_direct",
  description: "Directly search for restaurants by name, cuisine, or dish",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (restaurant name, dish name, cuisine type)"
      }
    },
    required: ["query"]
  }
};

const getRestaurantMenuTool = {
  name: "get_restaurant_menu",
  description: "Get the menu for a specific restaurant",
  inputSchema: {
    type: "object",
    properties: {
      restaurant_id: {
        type: "string",
        description: "ID of the restaurant"
      }
    },
    required: ["restaurant_id"]
  }
};

/**
 * Create an MCP server with capabilities for tools (to search restaurants and food)
 */
const server = new Server(
  {
    name: "swiggy-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchRestaurantsTool,
      searchRestaurantsDirectTool,
      getRestaurantMenuTool
    ]
  };
});

/**
 * Handler for tool execution.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    console.log(`[DEBUG] Executing tool: ${toolName}`);
    
    switch (toolName) {
      case "search_restaurants": {
        // Extract parameters
        const query = request.params.arguments?.query as string;
        if (!query) {
          throw new Error("Missing required parameter: query");
        }
        
        // Get the category from the query
        const category = query;
        
        // Set page type based on category
        const pageType = category ? categoryMap[category.toLowerCase()] || categoryMap.default : categoryMap.default;
        
        console.log(`[DEBUG] Browsing restaurants in category: ${category} using page_type=${pageType}`);
        
        // Use the SwiggyAPIClient to get restaurant data
        const data = await SwiggyAPIClient.getRestaurants(DEFAULT_LATITUDE, DEFAULT_LONGITUDE, pageType);
        
        // Handle API errors
        if (data.error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                message: `Error fetching restaurants: ${data.error}`,
                suggestions: ['Please try again later', 'Try with a different category']
              })
            }]
          };
        }
        
        // Extract restaurants using the helper method
        let restaurants = SwiggyAPIClient.extractRestaurantsFromResponse(data);
        
        // Limit to 5 restaurants to prevent token limit issues
        restaurants = restaurants.slice(0, 5);
        
        // Format the results with minimal data to reduce response size
        const results = restaurants.map(restaurant => ({
          type: 'restaurant',
          data: {
            id: restaurant.id,
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            rating: restaurant.rating,
            delivery_time: restaurant.delivery_time
          }
        }));
        
        // Return the results with helpful message if empty
        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                message: `No restaurants found in the '${category}' category`,
                suggestions: [
                  'Try a different category like "popular" or "recommended"',
                  'Try searching for specific restaurants using search_restaurants_direct',
                  'Check if the location coordinates are correct'
                ]
              })
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ results })
          }]
        };
      }
      
      case "search_restaurants_direct": {
        // Extract parameters
        const query = request.params.arguments?.query as string;
        if (!query) {
          throw new Error("Missing required parameter: query");
        }
        
        console.log(`[DEBUG] Direct searching restaurants with query: '${query}'`);
        
        // Use SwiggyAPIClient for search
        const data = await SwiggyAPIClient.searchRestaurants(query, DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
        
        // Handle errors and fallback to regular search if needed
        let restaurants = [];
        if (data.error) {
          if (data.needs_fallback) {
            console.log(`[DEBUG] Search API error, falling back to regular listing`);
            
            // Use regular listing as fallback
            const fallbackData = await SwiggyAPIClient.getRestaurants(DEFAULT_LATITUDE, DEFAULT_LONGITUDE, 'COLLECTION');
            
            if (fallbackData.error) {
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    message: `Error searching for restaurants: ${fallbackData.error}`,
                    suggestions: ['Please try again later', 'Try with a different search term']
                  })
                }]
              };
            }
            
            // Extract restaurants from fallback data
            restaurants = SwiggyAPIClient.extractRestaurantsFromResponse(fallbackData);
          } else {
            // Return error if there's no fallback option
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  message: `Error searching for restaurants: ${data.error}`,
                  suggestions: ['Please try again later', 'Try with a different search term']
                })
              }]
            };
          }
        } else {
          // Extract restaurants from search response
          restaurants = SwiggyAPIClient.extractRestaurantsFromResponse(data).slice(0, 5); // Limit to 5 restaurants
        }
        
        // Format the results with minimal data to reduce response size
        const results = restaurants.map(restaurant => ({
          type: 'restaurant',
          data: {
            id: restaurant.id,
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            rating: restaurant.rating,
            delivery_time: restaurant.delivery_time
          }
        }));
        
        // Return the results with helpful message if empty
        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                message: `No restaurants found matching '${query}'`,
                suggestions: [
                  'Try a more general search term',
                  'Try browsing by category with search_restaurants',
                  'Try searching for a cuisine type like "Italian" or "Indian"'
                ]
              })
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ results })
          }]
        };
      }
      
      
      case "get_restaurant_menu": {
        // Extract parameters
        const restaurantId = request.params.arguments?.restaurant_id as string;
        if (!restaurantId) {
          throw new Error("Missing required parameter: restaurant_id");
        }
        
        // Use SwiggyAPIClient to fetch menu data
        const data = await SwiggyAPIClient.getRestaurantMenu(restaurantId, DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
        
        // Handle errors
        if (data.error) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: data.error,
                message: data.message || 'Failed to fetch restaurant menu'
              })
            }]
          };
        }
        
        // Use the helper method to extract formatted menu data
        const menuData = SwiggyAPIClient.extractMenuData(data);
        
        // Format the restaurant info
        const restaurantName = menuData.restaurant_name;
        const restaurantInfo = {
          name: restaurantName,
          id: restaurantId,
          cuisines: menuData.cuisines,
          rating: menuData.rating
        };
        
        // Add featured items (first few items from first category)
        let featuredItems: any[] = [];
        if (menuData.menu.length > 0) {
          const firstCategory = menuData.menu[0];
          if (firstCategory.items.length > 0) {
            featuredItems = firstCategory.items.slice(0, 3); // Take first 3 items
          }
        }
        
        // Format menu data - limit to 10 items total across all categories
        const foodItems = [];
        let itemCount = 0;
        
        for (const category of menuData.menu) {
          if (itemCount >= 10) break;
          
          const categoryName = category.category;
          for (const item of category.items) {
            if (itemCount >= 10) break;
            
            // Add restaurant context to each food item
            // Format Cloudinary image URL if present
            let imageUrl = item.image_url;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/${imageUrl}`;
            }
            
            const foodItem = {
              type: 'food_item',
              data: {
                name: item.name,
                description: item.description,
                price: item.price,
                image_url: imageUrl,
                restaurant_name: restaurantName,
                restaurant_id: restaurantId,
                category: categoryName
              }
            };
            
            foodItems.push(foodItem);
            itemCount++;
          }
        }
        
        // Format the output with minimized data to reduce response size
        const result = {
          restaurant_name: restaurantName,
          restaurant_id: restaurantId,
          restaurant_info: restaurantInfo,
          // Only include 3 categories max with limited items each
          menu: menuData.menu.slice(0, 3).map(category => ({
            category: category.category,
            items: category.items.slice(0, 3) // Just 3 items per category
          })),
          results: foodItems.slice(0, 5), // Limit to 5 items total
          result_type: 'menu'
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result)
          }]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    console.error(`[ERROR] Tool execution error:`, error);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: `Error executing ${request.params.name || "tool"}`,
          message: error.message || String(error)
        })
      }],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  
  console.log("[INFO] Starting Swiggy MCP server");
  console.log(`[INFO] Using default location: ${DEFAULT_LATITUDE}, ${DEFAULT_LONGITUDE}`);
  
  await server.connect(transport);
  console.log("[INFO] Swiggy MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
