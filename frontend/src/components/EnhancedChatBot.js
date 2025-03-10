import React from 'react';
import ChatUI from './ChatUI/ChatUI';

/**
 * Enhanced chatbot component that uses the modular ChatUI system with a robust backend
 * Key features:
 * - Connects to a LangChain-powered backend with Bedrock for model inference
 * - Supports structured conversation with tool use for advanced actions
 * - Preserves conversation history for contextual awareness
 * - Displays detailed tool execution history per response
 * - Uses streaming responses for real-time feedback
 */
const EnhancedChatBot = (props) => {
  return <ChatUI {...props} />;
};

export default EnhancedChatBot;
