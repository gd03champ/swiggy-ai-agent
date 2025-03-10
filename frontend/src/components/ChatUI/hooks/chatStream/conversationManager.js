/**
 * Utilities for managing conversation state
 */

/**
 * Prepare a request body for the chat API
 * 
 * @param {string} messageText - User's message text
 * @param {string|null} conversationId - Current conversation ID if any
 * @param {Object} location - User's location data
 * @param {string|null} userId - User ID if available
 * @param {Object|null} mediaData - Any media data like images
 * @param {Array} recentMessages - Recent conversation messages to include as history
 * @returns {Object} Request body for the API
 */
export const prepareRequestBody = (
  messageText, 
  conversationId = null, 
  location, 
  userId = null, 
  mediaData = null,
  recentMessages = []
) => {
  // Format the last 6 messages into a special tag format
  let historyText = "";
  if (recentMessages.length > 0) {
    historyText = "\n\n<chat_history>\n";
    recentMessages.slice(-6).forEach(msg => {
      const role = msg.isUser ? "User" : "Assistant";
      historyText += `${role}: ${msg.text}\n`;
    });
    historyText += "</chat_history>";
  }

  // Combine the user's new message with the history
  const enhancedMessage = messageText + historyText;
  
  const requestBody = {
    message: enhancedMessage,
    conversation_id: conversationId,
    location,
    user_id: userId
  };
  
  // Add image data if present
  if (mediaData?.image) {
    requestBody.media = {
      type: 'image',
      data: mediaData.image,
      metadata: mediaData.metadata || {}
    };
  }
  
  return requestBody;
};

/**
 * Format a user message object for display in the chat
 * 
 * @param {string} messageText - User's message text
 * @param {Object|null} mediaData - Any media data like images
 * @returns {Object} Formatted message object
 */
export const formatUserMessage = (messageText, mediaData = null) => {
  return {
    text: messageText,
    isUser: true,
    image: mediaData?.image || null,
    timestamp: new Date().toISOString()
  };
};

/**
 * Format an agent response message for display in the chat
 * 
 * @param {string} responseText - Agent's response text
 * @param {Array} structuredDataItems - Structured data to include
 * @param {Array} reasoningSteps - Reasoning steps if any
 * @param {Array} toolHistory - Tool history for this message
 * @returns {Object} Formatted message object
 */
export const formatAgentResponse = (responseText, structuredDataItems, reasoningSteps, toolHistory) => {
  const timestamp = new Date().toISOString();
  const messageId = `msg-${Date.now()}`;
  
  return {
    id: messageId,
    text: responseText,
    isUser: false,
    structuredData: structuredDataItems,
    timestamp: timestamp,
    hasToolUse: toolHistory.length > 0,
    reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : null
  };
};

/**
 * Format an error message for display in the chat
 * 
 * @param {string} errorMessage - Error message to display
 * @returns {Object} Formatted error message object
 */
export const formatErrorMessage = (errorMessage) => {
  return {
    text: errorMessage || "Sorry, I encountered an error. Please try again.",
    isUser: false,
    error: true,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a stream reader for Server-Sent Events (SSE)
 * 
 * @param {Response} response - Fetch API response object
 * @returns {Object} Reader and decoder for processing the stream
 */
export const createStreamReader = (response) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  return { reader, decoder };
};
