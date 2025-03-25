// Default location (Bangalore)
export const DEFAULT_LATITUDE = 12.9716;
export const DEFAULT_LONGITUDE = 77.5946;

// API configuration
export const SWIGGY_API_BASE_URL = 'https://www.swiggy.com/dapi';
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
};

// Map categories to page types used by Swiggy API
export const categoryMap: Record<string, string> = {
  "recommended": "COLLECTION",
  "top": "COLLECTION",
  "popular": "COLLECTION",
  "best": "COLLECTION",
  "new": "NEW_RESTAURANT",
  "nearest": "SEO_RESTAURANT_LISTING",
  "default": "COLLECTION"
};
