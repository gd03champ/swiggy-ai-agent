/**
 * ChatUI Component Library
 * 
 * This file re-exports all components to simplify imports in the application
 */

// Main ChatUI Component
export { default } from './ChatUI';

// Indicators
export { default as ThinkingIndicator } from './indicators/ThinkingIndicator';
export { default as ToolExecutionIndicator } from './indicators/ToolExecutionIndicator';

// Cards
export { default as ProductCard } from './cards/ProductCard';
export { default as RestaurantCard } from './cards/RestaurantCard';
export { default as OrderDetails } from './cards/OrderDetails';
export { default as RefundStatus } from './cards/RefundStatus';

// Elements
export { default as SuggestionChips } from './elements/SuggestionChips';

// Utils
export { default as renderStructuredData } from './utils/renderStructuredData';

// Hooks
export { default as useChatStream } from './hooks/useChatStream';
