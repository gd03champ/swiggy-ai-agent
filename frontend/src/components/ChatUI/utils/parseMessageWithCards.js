/**
 * Parses a message containing embedded structured data in the format:
 * :::card-type{...json data...}:::
 * 
 * Supported card types:
 * - restaurant
 * - food_item
 * - product
 * - order_details
 * - refund_status
 * 
 * @param {string} text - The message text containing embedded structured data
 * @returns {Array} An array of text and card objects
 */
export function parseMessageWithCards(text) {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: text || '' }];
  }

  console.log("[DEBUG] Parsing message for cards, length:", text.length);
  
  // New improved regex pattern with better handling of nested structures
  // This pattern uses balanced brace matching to handle nested JSON properly
  // Handles both :::type{} and [type{}] formats with improved depth tracking
  const cardPattern = /(?::{2,5}(restaurant|food_item|product|order_details|refund_status|cart)|(?:\[(restaurant|food_item|product|order_details|refund_status|cart)\]))\s*(\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\})\s*(?::{2,5}|\])/g;
  
  // Split text by the pattern and process
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = cardPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }
    
    // Process the card data - get type from either first or second capturing group
    try {
      const cardType = match[1] || match[2];
      const jsonText = match[3];
      console.log(`[DEBUG] Found card of type ${cardType} with content length:`, jsonText.length);
      
      // More aggressive JSON cleanup for better parsing success
      let cleanJsonText = jsonText
        .replace(/(\w+)\s*:/g, '"$1":')  // Convert unquoted keys to quoted, handle whitespace
        .replace(/'/g, '"')              // Replace single quotes with double quotes
        .replace(/,\s*[}\]]/g, '$&')     // Fix trailing commas
        .replace(/\n/g, ' ')             // Remove newlines
        .replace(/:\s*"([^"]*?)"\s*([,}])/g, ':"$1"$2') // Fix spacing in string values
        .replace(/:\s*([-+]?[0-9]*\.?[0-9]+)\s*([,}])/g, ':$1$2'); // Fix spacing in numeric values
        
      let cardData;
      let parseMethod = "";
      
      // Three-stage parsing approach with detailed error handling
      try {
        // Stage 1: Try standard JSON parse first
        cardData = JSON.parse(jsonText);
        parseMethod = "standard";
      } catch(standardError) {
        try {
          // Stage 2: Try cleaned JSON if standard fails
          cardData = JSON.parse(cleanJsonText);
          parseMethod = "cleaned";
        } catch(cleanError) {
          try {
            // Stage 3: More aggressive cleaning for even more malformed JSON
            const ultraCleanJson = cleanJsonText
              .replace(/([{,])\s*([a-zA-Z0-9_]+):/g, '$1"$2":') // Ensure all keys are quoted
              .replace(/"([^"]*)"\s*:\s*"([^"]*)"/g, '"$1":"$2"') // Fix spacing in key-value pairs
              .replace(/,\s*}/g, '}')  // Fix trailing commas again (more aggressive)
              .replace(/,\s*]/g, ']'); // Fix trailing commas in arrays again
              
            cardData = JSON.parse(ultraCleanJson);
            parseMethod = "ultra-cleaned";
          } catch(ultraCleanError) {
            // Stage 4: Last resort pattern matching
            console.error("All JSON parsing methods failed, using pattern extraction", standardError);
            
            // Extract key-value pairs using more robust regex
            const keyValuePattern = /"?(\w+)"?\s*:\s*(?:"([^"]*)"|([-+]?[0-9]*\.?[0-9]+)|(\[[^\]]*\])|(\{[^}]*\}))/g;
            const matches = [...jsonText.matchAll(keyValuePattern)];
            
            cardData = {};
            matches.forEach(m => {
              const key = m[1];
              const value = m[2] || m[3] || m[4] || m[5] || null;
              
              // Try to parse nested arrays and objects
              if (value && (value.startsWith('[') || value.startsWith('{'))) {
                try {
                  cardData[key] = JSON.parse(value);
                } catch {
                  cardData[key] = value; // Keep as string if parsing fails
                }
              } else if (m[3] && !isNaN(Number(m[3]))) {
                // Convert numeric strings to numbers
                cardData[key] = Number(m[3]);
              } else {
                cardData[key] = value;
              }
            });
            
            parseMethod = "regex-extracted";
          }
        }
      }
      
      // Process arrays that may have been captured as strings
      if (cardData) {
        Object.keys(cardData).forEach(key => {
          // If we have a string that looks like an array, try to parse it
          if (typeof cardData[key] === 'string' && 
              cardData[key].trim().startsWith('[') && 
              cardData[key].trim().endsWith(']')) {
            try {
              cardData[key] = JSON.parse(cardData[key]);
              console.log(`[DEBUG] Converted string array to actual array for key: ${key}`);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
        });
      }
      
      if (cardData && Object.keys(cardData).length > 0) {
        parts.push({
          type: 'card',
          cardType,
          cardData
        });
        console.log(`[DEBUG] Successfully added ${cardType} card using ${parseMethod} method with ${Object.keys(cardData).length} properties`);
      } else {
        throw new Error("Failed to parse card data");
      }
    } catch (e) {
      console.error('Error parsing card data:', e);
      // Include the problematic text as regular text
      parts.push({
        type: 'text',
        content: match[0]
      });
    }
    
    // Update last index
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }
  
  return parts;
}

/**
 * Validates if a string contains embedded card data
 * 
 * @param {string} text - The text to validate
 * @returns {boolean} True if the text contains embedded cards, false otherwise
 */
export function containsCardData(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Use the improved pattern that handles nested braces better
  const pattern = /(?::{2,5}(restaurant|food_item|product|order_details|refund_status|cart)|(?:\[(restaurant|food_item|product|order_details|refund_status|cart)\]))\s*\{/;
  
  const hasCard = pattern.test(text);
  console.log(`[DEBUG] containsCardData check: ${hasCard ? 'Found cards' : 'No cards found'} in message`);
  
  // If we found a card, log more details
  if (hasCard) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const type = matches[1] || matches[2];
      console.log(`[DEBUG] Found card of type '${type}'`);
    }
  }
  
  return hasCard;
}
