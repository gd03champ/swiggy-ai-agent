import React from 'react';
import ProductCard from '../cards/ProductCard';
import RestaurantCard from '../cards/RestaurantCard';
import OrderDetails from '../cards/OrderDetails';
import RefundStatus from '../cards/RefundStatus';
import DocumentAnalysisResult from '../cards/DocumentAnalysisResult';
import ImageVerificationStatus from '../indicators/ImageVerificationStatus';
import RefundWorkflowStatus from '../indicators/RefundWorkflowStatus';

/**
 * Enhanced utility function to render the appropriate component based on structured data type
 * 
 * @param {string|object} type - The type of data to render or the entire structured data object
 * @param {object} data - The data object to be passed to the component
 * @returns {React.ReactNode|null} - The rendered component or null if type is not recognized
 */
const renderStructuredData = (type, data) => {
  // Debug logging for structured data rendering
  console.log(`[RENDER] Rendering structured data of type:`, type);
  console.log(`[RENDER] Data:`, data);
  
  // Special log for direct debugging
  if (typeof type === 'object' && type !== null) {
    console.log('[RENDER CRITICAL] Direct object passed as type:', type);
  }

  // Enhanced type/data extraction with better error handling
  let processedData = data;
  let processedType = type;

  try {
    // Handle case when type is actually the entire structured data object
    if (typeof type === 'object' && type !== null) {
      if (type.type && type.data) {
        console.log(`[RENDER] Type parameter contains a full structured data object`);
        processedType = type.type;
        processedData = type.data;
      } else if (type.name && (type.rating || type.price)) {
        // Try to infer the type from the data
        console.log(`[RENDER] Inferring type from object properties`);
        processedType = type.price ? 'food_item' : 'restaurant';
        processedData = type;
      }
    }

    // Handle null/undefined data
    if (!processedData) {
      console.warn(`[RENDER] Received null or undefined data for type: ${processedType}`);
      return null;
    }

    // If data contains a nested type/data structure, extract it
    if (processedData && processedData.type && processedData.data) {
      console.log(`[RENDER] Found nested data structure, extracting inner data`);
      processedType = processedData.type;
      processedData = processedData.data;
    }
  
    // Validate that we have actual data to work with
    if (!processedData) {
      console.warn(`[RENDER] Processed data is null or undefined after extraction`);
      return null;
    }
  
    // Normalize type strings for consistent handling
    if (typeof processedType === 'string') {
      processedType = processedType.toLowerCase();

      // Map food_item to product for backward compatibility
      if (processedType === 'food_item') {
        processedType = 'product';
      }
    }

    console.log(`[RENDER] Final processedType:`, processedType);
    console.log(`[RENDER] Final processedData:`, processedData);

    // If we receive a results array directly, try to intelligently render each item
    if (Array.isArray(processedData) || (processedData && Array.isArray(processedData.results))) {
      const items = Array.isArray(processedData) ? processedData : processedData.results;
      console.log(`[RENDER] Rendering array of ${items.length} items`);
      
      return (
        <div className="flex flex-col gap-3 mt-1 mb-3">
          {items.map((item, idx) => {
            // Each item might itself be a structured data object
            const itemType = item.type || processedType;
            const itemData = item.data || item;
            
            return (
              <div key={idx}>
                {renderStructuredData(itemType, itemData)}
              </div>
            );
          })}
        </div>
      );
    }

  // Regular component rendering based on type
  switch (processedType) {
    case 'product':
    case 'food_item': // Add support for the food_item type from backend
      console.log("[RENDER] Rendering ProductCard with data:", processedData);
      return <ProductCard product={processedData} />;
    case 'restaurant':
      console.log("[RENDER] Rendering RestaurantCard with data:", processedData);
      return <RestaurantCard restaurant={processedData} />;
    case 'order_details':
      console.log("[RENDER] Rendering OrderDetails with data:", processedData);
      // Clone the data and prepare for rendering with better handling of nested structures
      let orderData = {...processedData};
      
      // Handle case where order data might be nested under 'order' or 'data' property
      if (orderData.order && typeof orderData.order === 'object') {
        console.log("[RENDER] Found nested order data in 'order' property");
        orderData = {...orderData, ...orderData.order};
      }
      
      // Special handling for LLM responses that might include both order data and markdown text
      if (typeof orderData === 'object' && 'total_price' in orderData) {
        console.log("[RENDER] Found total_price in root object");
        // This is potentially an order object that needs to be wrapped
        if (!('type' in orderData)) {
          orderData = {
            type: 'order_details',
            data: orderData
          };
        }
      }
      
      console.log("[RENDER] Normalized order data for rendering:", orderData);
      return <OrderDetails order={orderData} />;
      
    case 'refund_status':
      console.log("[RENDER] Rendering RefundStatus with data:", processedData);
      // Handle different refund data structures
      let refundData = {...processedData};
      
      // Handle nested refund data
      if (refundData.refund && typeof refundData.refund === 'object') {
        console.log("[RENDER] Found nested refund data in 'refund' property");
        refundData = {...refundData, ...refundData.refund};
      }
      
      // Special handling for cases where we need to wrap
      if (typeof refundData === 'object' && ('status' in refundData || 'refund_status' in refundData)) {
        // This is potentially a refund object that needs to be wrapped
        if (!('type' in refundData)) {
          refundData = {
            type: 'refund_status',
            data: refundData
          };
        }
      }
      
      console.log("[RENDER] Passing refund data to RefundStatus component:", refundData);
      return <RefundStatus refund={refundData} />;
      
    case 'image_verification_result':
      console.log("[RENDER] Rendering ImageVerificationStatus with data:", processedData);
      return <ImageVerificationStatus verificationResult={processedData} />;
      
    case 'refund_workflow_state':
      console.log("[RENDER] Rendering RefundWorkflowStatus with data:", processedData);
      return <RefundWorkflowStatus workflowState={processedData} />;
      
    case 'document_analysis_result':
      console.log("[RENDER] Rendering DocumentAnalysisResult with data:", processedData);
      return <DocumentAnalysisResult analysis={processedData} />;
      
    case 'dietary_recommendations':
      console.log("[RENDER] Rendering dietary recommendations as document analysis:", processedData);
      // Transform dietary recommendations to a format suitable for DocumentAnalysisResult
      const dietaryData = {
        document_type: 'diet_plan',
        analysis_confidence: 90,
        dietary_goals: processedData.dietary_approach,
        foods_recommended: processedData.foods_to_emphasize,
        foods_to_avoid: processedData.foods_to_limit,
        meal_plan: [
          { meal: "Breakfast", foods: processedData.meal_plan?.breakfast || [] },
          { meal: "Lunch", foods: processedData.meal_plan?.lunch || [] },
          { meal: "Dinner", foods: processedData.meal_plan?.dinner || [] },
          { meal: "Snacks", foods: processedData.meal_plan?.snacks || [] }
        ],
        special_instructions: processedData.special_considerations,
        patient_info: {
          other_details: `Medical condition: ${processedData.condition}` +
            (processedData.restrictions?.length ? `\nDietary restrictions: ${processedData.restrictions.join(', ')}` : '')
        }
      };
      return <DocumentAnalysisResult analysis={dietaryData} />;
      
    default:
        // For debugging - show the unrecognized data
        console.log('Unrecognized data type:', processedType);
        console.log('Data:', processedData);
        
        // Enhanced inference logic with better property checks
        if (processedData) {
          // Check for restaurant properties
          if ((processedData.name || processedData.restaurant_name) && 
              (processedData.rating || processedData.cuisine || 
              processedData.delivery_time || processedData.distance)) {
            console.log(`[RENDER] Inferred type: restaurant`);
            return <RestaurantCard restaurant={processedData} />;
          } 
          // Check for food item properties
          else if ((processedData.name || processedData.item_name) && 
                  (processedData.price || processedData.cost || processedData.description || 
                  processedData.category)) {
            console.log(`[RENDER] Inferred type: food_item/product`);
            return <ProductCard product={processedData} />;
          }
        }
        
        console.warn(`[RENDER] Unable to render unknown data type: ${processedType}`);
        return null;
    }
  } catch (error) {
    console.error('[RENDER] Error rendering structured data:', error);
    return null;
  }
};

export default renderStructuredData;
