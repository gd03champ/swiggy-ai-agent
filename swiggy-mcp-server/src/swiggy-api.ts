/**
 * SwiggyAPIClient - TypeScript port of the Python client
 * Handles all interactions with the Swiggy API
 */
import axios from 'axios';
import { DEFAULT_HEADERS, SWIGGY_API_BASE_URL } from './constants.js';

/**
 * Type definitions for API responses and data models
 */
export interface Restaurant {
  id: string;
  name: string;
  image_url?: string;
  rating: string | number;
  cuisine: string;
  delivery_time: string;
  cost_for_two: string | number;
  veg?: boolean;
  location?: string;
  offers?: any[];
  isOpen?: boolean;
}

export interface FoodItem {
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

export interface MenuCategory {
  category: string;
  items: FoodItem[];
}

export interface Menu {
  restaurant_name: string;
  cuisines: string[];
  rating: string | number;
  menu: MenuCategory[];
}

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

/**
 * SwiggyAPIClient class
 */
export class SwiggyAPIClient {
  // In-memory cache
  private static restaurantCache = new Map<string, CacheEntry<any>>();
  private static menuCache = new Map<string, CacheEntry<any>>();
  private static searchCache = new Map<string, CacheEntry<any>>();

  /**
   * Get restaurant listings from Swiggy API with optional caching
   */
  static async getRestaurants(
    latitude: number,
    longitude: number,
    pageType: string = 'COLLECTION',
    useCache: boolean = true,
    cacheTtl: number = 300 // 5 minutes
  ): Promise<any> {
    const cacheKey = `restaurants:${pageType}:${latitude}:${longitude}`;

    // Try to get from cache if enabled
    if (useCache && this.restaurantCache.has(cacheKey)) {
      const cached = this.restaurantCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTtl * 1000) {
        console.log(`[DEBUG] Using cached restaurants for ${pageType}`);
        return cached.data;
      }
    }

    // Fetch from API
    const url = `${SWIGGY_API_BASE_URL}/restaurants/list/v5?lat=${latitude}&lng=${longitude}&page_type=${pageType}`;
    const data = await this.makeRequest(url);

    // Update cache if successful and caching is enabled
    if (useCache && !data.error) {
      this.restaurantCache.set(cacheKey, { timestamp: Date.now(), data });
    }

    return data;
  }

  /**
   * Search for restaurants by query string
   */
  static async searchRestaurants(
    query: string,
    latitude: number,
    longitude: number,
    useCache: boolean = true,
    cacheTtl: number = 180 // 3 minutes
  ): Promise<any> {
    const cacheKey = `search:${query}:${latitude}:${longitude}`;

    // Try to get from cache if enabled
    if (useCache && this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTtl * 1000) {
        console.log(`[DEBUG] Using cached search results for '${query}'`);
        return cached.data;
      }
    }

    // Fetch from API
    const url = `${SWIGGY_API_BASE_URL}/restaurants/search/v3?lat=${latitude}&lng=${longitude}&str=${encodeURIComponent(query)}&trackingId=undefined`;
    const data = await this.makeRequest(url);

    // Update cache if successful and caching is enabled
    if (useCache && !data.error) {
      this.searchCache.set(cacheKey, { timestamp: Date.now(), data });
    }

    return data;
  }

  /**
   * Get menu for a specific restaurant
   */
  static async getRestaurantMenu(
    restaurantId: string,
    latitude: number,
    longitude: number,
    useCache: boolean = true,
    cacheTtl: number = 600 // 10 minutes
  ): Promise<any> {
    const cacheKey = `menu:${restaurantId}:${latitude}:${longitude}`;

    // Try to get from cache if enabled
    if (useCache && this.menuCache.has(cacheKey)) {
      const cached = this.menuCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheTtl * 1000) {
        console.log(`[DEBUG] Using cached menu for restaurant ${restaurantId}`);
        return cached.data;
      }
    }

    // Fetch from API
    const url = `${SWIGGY_API_BASE_URL}/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=${latitude}&lng=${longitude}&submitAction=ENTER&restaurantId=${restaurantId}`;
    const data = await this.makeRequest(url);

    // Update cache if successful and caching is enabled
    if (useCache && !data.error) {
      this.menuCache.set(cacheKey, { timestamp: Date.now(), data });
    }

    return data;
  }

  /**
   * Make API request with error handling and retry logic
   */
  private static async makeRequest(url: string): Promise<any> {
    const maxRetries = 3;
    let retryCount = 0;
    const backoffFactor = 1.5;

    while (retryCount < maxRetries) {
      try {
        const response = await axios.get(url, { headers: DEFAULT_HEADERS });

        if (response.status !== 200) {
          if (retryCount < maxRetries - 1) {
            retryCount++;
            const waitTime = Math.pow(backoffFactor, retryCount);
            console.log(`[DEBUG] Request failed with status ${response.status}, retrying in ${waitTime.toFixed(1)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            continue;
          }
          return {
            error: `API returned status code ${response.status}`,
            message: 'Failed to fetch data from Swiggy API'
          };
        }

        const data = response.data;

        // Check for API-level errors
        if (data.statusCode !== undefined && data.statusCode !== 0) {
          const errorMessage = data.statusMessage || 'Unknown API error';

          // For some search API errors, we might need special handling
          if (url.indexOf('/search/v3') > 0 && data.statusCode === 1) {
            console.log(`[DEBUG] Search API error: ${errorMessage}, will use fallback`);
            return {
              error: errorMessage,
              status_code: data.statusCode,
              needs_fallback: true
            };
          }

          return {
            error: errorMessage,
            status_code: data.statusCode
          };
        }

        return data;
      } catch (e: any) {
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = Math.pow(backoffFactor, retryCount);
          console.log(`[DEBUG] Network error: ${e.message}, retrying in ${waitTime.toFixed(1)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          continue;
        }
        return {
          error: `Network error: ${e.message}`,
          message: 'Failed to connect to Swiggy API'
        };
      }
    }

    // Should never reach here, but TypeScript requires a return
    return { error: 'Unexpected error in request handling' };
  }

  /**
   * Extract structured restaurant data from API response
   */
  static extractRestaurantsFromResponse(data: any): Restaurant[] {
    const restaurants: Restaurant[] = [];

    try {
      // First check for data.cards path (restaurant listing)
      if (data?.data?.cards) {
        // Find all restaurant grid listings
        for (const card of data.data.cards) {
          if (
            card?.card?.card &&
            card.card.card['@type'] === 'type.googleapis.com/swiggy.gandalf.widgets.v2.GridWidget'
          ) {
            // Check for restaurant grid ID or if it contains restaurant info
            const cardData = card.card.card;
            if (cardData?.gridElements?.infoWithStyle?.restaurants) {
              for (const restItem of cardData.gridElements.infoWithStyle.restaurants) {
                if (restItem.info) {
                  const restaurant = this.extractRestaurantData(restItem.info);
                  if (restaurant) {
                    restaurants.push(restaurant);
                  }
                }
              }
            }
          }
        }
      }
      
      // Alternative structure for search API
      else if (data?.data?.restaurants) {
        for (const restInfo of data.data.restaurants) {
          if (restInfo.info) {
            const restaurant = this.extractRestaurantData(restInfo.info);
            if (restaurant) {
              restaurants.push(restaurant);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error extracting restaurants: ${e}`);
    }

    return restaurants;
  }

  /**
   * Extract consistent restaurant data from restaurant info object
   */
  static extractRestaurantData(restInfo: any): Restaurant | null {
    try {
      // Extract delivery time from either direct field or sla object
      let deliveryTime = '30 min'; // Default
      if (restInfo.deliveryTime) {
        deliveryTime = `${restInfo.deliveryTime} min`;
      } else if (restInfo.sla && restInfo.sla.deliveryTime) {
        deliveryTime = `${restInfo.sla.deliveryTime} min`;
      }

      return {
        id: restInfo.id || '',
        name: restInfo.name || 'Unknown Restaurant',
        image_url: restInfo.cloudinaryImageId || undefined,
        rating: restInfo.avgRating || 'N/A',
        cuisine: (restInfo.cuisines || []).join(', '),
        delivery_time: deliveryTime,
        cost_for_two: restInfo.costForTwo || '',
        veg: restInfo.veg || false,
        location: restInfo.areaName || '',
        offers: restInfo.offers || [],
        isOpen: restInfo.isOpen !== undefined ? restInfo.isOpen : true
      };
    } catch (e) {
      console.error(`Error extracting restaurant data: ${e}`);
      return null;
    }
  }

  /**
   * Extract structured menu data from API response
   */
  static extractMenuData(data: any): Menu {
    try {
      // Extract restaurant information
      let restaurantData = null;
      if (data?.data?.cards) {
        for (const card of data.data.cards) {
          if (
            card?.card?.['@type'] === 'type.googleapis.com/swiggy.presentation.food.v2.Restaurant'
          ) {
            restaurantData = card.card.info;
            break;
          }
        }
      }

      // Extract menu information
      const restaurantMenu: any[] = [];
      if (data?.data?.cards) {
        for (const card of data.data.cards) {
          if (card?.groupedCard?.cardGroupMap?.REGULAR?.cards) {
            for (const menuCard of card.groupedCard.cardGroupMap.REGULAR.cards) {
              if (
                menuCard?.card?.card?.['@type'] === 'type.googleapis.com/swiggy.presentation.food.v2.ItemCategory'
              ) {
                const category = menuCard.card.card;
                if (category) {
                  restaurantMenu.push(category);
                }
              }
            }
          }
        }
      }

      // Format response for frontend
      const formattedMenu: MenuCategory[] = [];

      for (const category of restaurantMenu) {
        const categoryName = category.title || 'Uncategorized';
        const items: FoodItem[] = [];

        if (category.itemCards && Array.isArray(category.itemCards)) {
          for (const itemCard of category.itemCards) {
            const itemInfo = itemCard?.card?.info;
            if (itemInfo) {
              items.push({
                name: itemInfo.name || 'Unknown Item',
                description: itemInfo.description || '',
                price: (itemInfo.price || 0) / 100, // Convert from paise to rupees
                image_url: itemInfo.imageId || undefined // This is a Cloudinary ID
              });
            }
          }
        }

        if (items.length > 0) {
          formattedMenu.push({
            category: categoryName,
            items
          });
        }
      }

      return {
        restaurant_name: restaurantData?.name || 'Unknown Restaurant',
        cuisines: restaurantData?.cuisines || [],
        rating: restaurantData?.avgRating || 'N/A',
        menu: formattedMenu
      };
    } catch (e) {
      console.error(`Error extracting menu data: ${e}`);
      return {
        restaurant_name: 'Error',
        cuisines: [],
        rating: 'N/A',
        menu: []
      };
    }
  }
}
