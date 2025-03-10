/**
 * Main entry point for the useChatStream hook
 * Brings together all the chat stream processing logic
 */
import { useState, useCallback } from 'react';
import { processReasoningStep, processAgentAction, processStructuredData } from './eventProcessors';
import { processToolStart, processToolEnd, processToolError, processDoneEvent } from './toolEventHandlers';
import { processStructuredData as formatStructuredData } from './structuredDataProcessor';
import { 
  prepareRequestBody, 
  formatUserMessage, 
  formatAgentResponse, 
  formatErrorMessage,
  createStreamReader
} from './conversationManager';

/**
 * Custom hook for managing chat streaming requests
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.baseUrl - Base API URL for chat requests (defaults to '/api/agent/chat/stream')
 * @param {Object} options.defaultLocation - Default user location if not provided
 * @returns {Object} Chat streaming methods and state
 */
const useChatStream = (options = {}) => {
  const {
    baseUrl = 'http://localhost:8000/api/agent/chat/stream',
    defaultLocation = { latitude: 12.9716, longitude: 77.5946 }
  } = options;

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState('');
  const [toolExecution, setToolExecution] = useState(null);
  const [toolHistory, setToolHistory] = useState([]);
  const [processCollapsed, setProcessCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageToolHistory, setMessageToolHistory] = useState({});
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Send a message to the streaming API endpoint
   * 
   * @param {string} messageText - The text message to send
   * @param {Object} location - User's geolocation
   * @param {string|null} userId - Optional user ID
   * @param {Object} mediaData - Optional media data like images
   * @param {string} mediaData.image - Base64-encoded image data
   * @param {Object} mediaData.metadata - Media metadata
   */
  const sendMessage = useCallback(async (
    messageText, 
    location = defaultLocation,
    userId = null,
    mediaData = null
  ) => {
    if (!messageText.trim()) return;

    // Always add user message to chat, include image data if present
    setMessages(prevMessages => [
      ...prevMessages, 
      formatUserMessage(messageText, mediaData)
    ]);
    
    // Set UI state for loading
    setIsLoading(true);
    setThinking('');
    setError(null);
    
    try {
      // Get recent messages for history context before adding the new user message
      const recentMessages = messages;
      
      // Connect to streaming endpoint
      const requestBody = prepareRequestBody(
        messageText, 
        conversationId, 
        location, 
        userId, 
        mediaData,
        recentMessages // Pass recent messages for history
      );
      
      // Debug log to verify location data is being sent properly
      console.log("Sending request with location data:", location);
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Set up event source for SSE
      const { reader, decoder } = createStreamReader(response);
      let thinkingText = '';
      let responseText = '';
      let structuredDataItems = [];
      let currentToolHistory = [...toolHistory];
      let reasoningSteps = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
            
            // Process different event types
            switch (data.type) {
              case 'thinking':
                thinkingText += data.data;
                setThinking(thinkingText);
                break;
                
              case 'reasoning_step':
                const result = processReasoningStep(
                  data, 
                  reasoningSteps, 
                  thinkingText,
                  setThinking,
                  setToolHistory,
                  setToolExecution,
                  setProcessCollapsed
                );
                thinkingText = result.thinkingText;
                reasoningSteps = result.reasoningSteps;
                break;
                
              case 'agent_action':
                currentToolHistory = processAgentAction(
                  data, 
                  currentToolHistory, 
                  setToolHistory, 
                  setToolExecution, 
                  setProcessCollapsed
                );
                break;
                
              case 'message':
                responseText = data.data;
                break;
                
              case 'structured_data':
                structuredDataItems = processStructuredData(data, structuredDataItems);
                break;
                
              case 'tool_start':
                currentToolHistory = processToolStart(
                  data,
                  currentToolHistory,
                  setToolHistory,
                  setToolExecution,
                  setProcessCollapsed
                );
                break;
                
              case 'tool_end':
                currentToolHistory = processToolEnd(
                  data,
                  currentToolHistory,
                  setToolHistory,
                  setToolExecution
                );
                break;
                
              case 'tool_error':
                const errorResult = processToolError(
                  data,
                  currentToolHistory,
                  thinkingText,
                  setToolHistory,
                  setToolExecution,
                  setThinking
                );
                currentToolHistory = errorResult.toolHistory;
                thinkingText = errorResult.thinkingText;
                break;
                
              case 'done':
                processDoneEvent(
                  data,
                  toolExecution,
                  setConversationId,
                  setProcessCollapsed,
                  setToolExecution
                );
                break;
                
              default:
                console.log(`Unhandled event type: ${data.type}`, data);
            }
          } catch (e) {
            console.error('Error parsing SSE message', e);
          }
        }
      }
      
      // Add agent's response with any structured data
      if (responseText || structuredDataItems.length > 0 || reasoningSteps.length > 0) {
        // Process and format structured data
        const processedStructuredData = formatStructuredData(structuredDataItems);
        
        // Log structured data for debugging
        console.log('Processed structured data:', processedStructuredData);
        console.log('Collected reasoning steps:', reasoningSteps);
        
        // Generate a unique ID for this message
        const messageId = `msg-${Date.now()}`;
        
        // Save current tool history for this message
        setMessageToolHistory(prev => ({
          ...prev,
          [messageId]: [...currentToolHistory]
        }));
        
        // Add the agent's response to the messages
        const agentResponse = formatAgentResponse(
          responseText, 
          processedStructuredData, 
          reasoningSteps, 
          currentToolHistory
        );
        
        setMessages(prevMessages => [...prevMessages, {
          ...agentResponse,
          id: messageId
        }]);
        
        // Reset tool history for next message
        setToolHistory([]);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to send message');
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages,
        formatErrorMessage(err.message)
      ]);
    } finally {
      setIsLoading(false);
      setThinking('');
    }
  }, [baseUrl, conversationId, toolHistory, defaultLocation, toolExecution]);

  /**
   * Clear all conversation data
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setThinking('');
    setToolExecution(null);
    setToolHistory([]);
    setConversationId(null);
    setError(null);
  }, []);
  
  /**
   * Load a previous conversation by ID
   * @param {string} conversationId - The ID of the conversation to load
   */
  const loadConversation = useCallback(async (conversationId) => {
    try {
      console.log("Loading conversation with ID:", conversationId);
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/conversation/${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load conversation: ${response.status}`);
      }
      
      const conversation = await response.json();
      console.log("Loaded conversation data:", conversation);
      
      // Set conversation ID
      setConversationId(conversation.session_id);
      
      // Reset messages
      setMessages([]);
      
      // Convert messages from MongoDB format to our app format
      if (conversation.messages && Array.isArray(conversation.messages)) {
        // Sort messages by timestamp if available
        const sortedMessages = [...conversation.messages].sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return aTime - bTime;
        });
        
        // Transform to app format
        const appMessages = sortedMessages.map(msg => ({
          id: msg._id || `historic-${Date.now()}-${Math.random()}`,
          text: msg.content || msg.text || "",
          isUser: msg.role === 'user',
          structuredData: msg.structured_data || [],
          timestamp: msg.timestamp || new Date().toISOString(),
          error: false
        }));
        
        setMessages(appMessages);
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
      setError(`Failed to load conversation: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isLoading,
    thinking,
    toolExecution,
    toolHistory,
    processCollapsed,
    messages,
    messageToolHistory,
    conversationId,
    error,
    
    // State setters
    setProcessCollapsed,
    
    // Actions
    sendMessage,
    clearMessages,
    loadConversation
  };
};

export default useChatStream;
