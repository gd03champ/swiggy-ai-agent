import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';

// Import components
import ThinkingIndicator from './indicators/ThinkingIndicator';
import ToolExecutionIndicator from './indicators/ToolExecutionIndicator';
import SuggestionChips from './elements/SuggestionChips';
import RefundSuggestionChips from './elements/RefundSuggestionChips';
import MessageToolHistory from './elements/MessageToolHistory';
import ReasoningSteps from './elements/ReasoningSteps';
import HistoryView from './elements/HistoryView';
import renderStructuredData from './utils/renderStructuredData';
import EnhancedMessage from './elements/EnhancedMessage'; // Import our new component

// Import styles
import './styles/chatPatterns.css';
import './styles/markdown.css';
import './styles/cardAnimations.css';
import './styles/enhancedEffects.css';

// Import custom hooks
import useChatStream from './hooks/useChatStream';

/**
 * Main ChatUI component that renders the chat interface
 */

const ChatUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showRefundChips, setShowRefundChips] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get user location from Redux store
  const lat = useSelector(state => state.location?.latitude || 12.9716);
  const lng = useSelector(state => state.location?.longitude || 77.5946);

  // Use the custom hook for chat streaming
  const {
    sendMessage,
    clearMessages,
    loadConversation,
    messages,
    isLoading,
    thinking,
    toolExecution,
    toolHistory,
    messageToolHistory,
    conversationId,
    error,
    processCollapsed,
    toggleProcess
  } = useChatStream({
    defaultLocation: { latitude: lat, longitude: lng }
  });
  
  // Handle conversation selection from history
  const handleSelectConversation = async (conversation) => {
    if (conversation && conversation.session_id) {
      // Close the history panel
      setIsHistoryOpen(false);
      
      // Load the selected conversation
      await loadConversation(conversation.session_id);
      
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 100);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages, thinking, or toolExecution change
  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking, toolExecution]);
  
  // Set initial suggestions
  useEffect(() => {
    if (messages.length === 0) {
      setSuggestions([
        "Find pizza restaurants near me",
        "What's the status of my order?",
        "I need help with my refund",
        "Show me top rated restaurants"
      ]);
    }
  }, [messages.length]);

  // State to hold pending image uploads
  const [pendingImage, setPendingImage] = useState(null);
  
  const handleChipSelect = (text) => {
    setInputValue(text);
    // Automatically send the message
    handleSendMessage(text);
    // Clear suggestions after selection
    setSuggestions([]);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Only allow image files
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    
    // Create a preview for the user to see
    const reader = new FileReader();
    reader.onload = (e) => {
      // Store image data for when the user sends a message
      setPendingImage({
        data: e.target.result,
        metadata: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      });
      
      // Set a helpful message for the user
      setInputValue(
        inputValue ? 
          `${inputValue} (Image: ${file.name} attached)` : 
          `(Image: ${file.name} attached) Add your message here for refund verification...`
      );
    };
    reader.readAsDataURL(file);
  };
  
  const handleSendMessage = async (manualText = null) => {
    const messageText = manualText || inputValue;
    if ((!messageText.trim() && !pendingImage)) return;
    
    // Clear input field
    setInputValue('');
    
    if (pendingImage) {
      // First add the message with image preview to the UI immediately
      const userMessage = {
        text: messageText,
        isUser: true,
        image: pendingImage.data,
        timestamp: new Date().toISOString()
      };
      
      // Send message with attached image
      await sendMessage(
        messageText || "Please verify this for my refund request", // Use meaningful default if no text
        { latitude: lat, longitude: lng },
        null, // userId
        { 
          image: pendingImage.data,
          metadata: pendingImage.metadata
        }
      );
      
      // Clear the pending image
      setPendingImage(null);
    } else {
      // Regular text-only message
      await sendMessage(messageText, { latitude: lat, longitude: lng });
    }
    
    // Generate new context-aware suggestions
    const newSuggestions = generateSuggestions(messageText);
    setSuggestions(newSuggestions);
  };

  // Check for refund-related messages and show refund chips when appropriate
  useEffect(() => {
    if (messages.length > 0) {
      // Get the last two messages to determine context
      const recentMessages = messages.slice(-2);
      
      // Check if the bot is asking for refund reason or if user mentioned refund
      const shouldShowRefundChips = recentMessages.some(msg => {
        if (msg.isUser) {
          const lowerText = msg.text.toLowerCase();
          return lowerText.includes('refund') || lowerText.includes('money back');
        } else {
          const lowerText = typeof msg.text === 'string' ? msg.text.toLowerCase() : '';
          return (
            lowerText.includes('reason for refund') || 
            lowerText.includes('reason for your refund') ||
            lowerText.includes('refund reason') ||
            lowerText.includes('upload an image') && lowerText.includes('refund') ||
            lowerText.includes('verify your refund')
          );
        }
      });
      
      setShowRefundChips(shouldShowRefundChips);
    }
  }, [messages]);
  
  // Generate context-aware suggestions based on the last message
  const generateSuggestions = (lastMessage) => {
    const lowerMessage = lastMessage.toLowerCase();
    
    // If we're showing refund chips, don't show regular suggestions
    if (showRefundChips) {
      return [];
    }
    
    if (lowerMessage.includes('pizza') || lowerMessage.includes('restaurant')) {
      return [
        "Show me the menu",
        "What are their opening hours?",
        "Is delivery available?",
        "Any vegetarian options?"
      ];
    }
    
    if (lowerMessage.includes('order')) {
      return [
        "Track my order",
        "I'd like to cancel my order",
        "Change my delivery address",
        "Add more items to my order"
      ];
    }
    
    if (lowerMessage.includes('refund')) {
      return [
        "What's my refund status?",
        "How long until I get my money back?",
        "I haven't received my refund yet",
        "Can I change my refund method?"
      ];
    }
    
    // Default suggestions
    return [
      "Find restaurants near me",
      "Show my recent orders",
      "Help with a refund",
      "Contact customer service"
    ];
  };

  return (
    <>
      <div className="fixed top-1/2 right-0 -translate-y-1/2 z-50">
        <motion.button
          className="w-14 h-14 rounded-l-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all"
          onClick={toggleChat}
          aria-label="Toggle chat"
          whileHover={{ scale: 1.05, boxShadow: "-5px 0 25px -5px rgba(252, 128, 25, 0.5)" }}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className={`fixed ${
                isFullScreen 
                  ? "inset-0 rounded-none glass-panel-enhanced border-0" 
                  : "top-0 right-0 h-full glass-panel-enhanced rounded-l-2xl border-l border-white/30 w-[40%] min-w-[350px]"
              } shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-5 z-40 flex flex-col overflow-hidden chat-bg-pattern`}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 20 }}
            >
              {/* Particle effects */}
              <div className="particle-container">
                <motion.div 
                  className="particle particle-1"
                  animate={{
                    opacity: [0, 0.7, 0],
                    y: [-20, -60],
                    x: [0, 30]
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "loop"
                  }}
                />
                <motion.div 
                  className="particle particle-2"
                  animate={{
                    opacity: [0, 0.5, 0],
                    y: [-10, -70],
                    x: [0, -20]
                  }}
                  transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 2
                  }}
                />
                <motion.div 
                  className="particle particle-3"
                  animate={{
                    opacity: [0, 0.6, 0],
                    y: [-5, -50],
                    x: [0, 10]
                  }}
                  transition={{ 
                    duration: 12,
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 4
                  }}
                />
              </div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center">
                  <motion.div className="w-8 h-8 flex items-center justify-center mr-2">
                    <motion.img 
                      src="https://img.icons8.com/?size=512&id=M8M9YjBrtUkd&format=png"
                      className="w-8 h-8"
                      alt="Swiggy AI"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Swiggy AI</h2>
                </div>
                <div className="flex gap-2">
                  {/* History button */}
                  <button
                    className="text-gray-500 hover:text-gray-700 relative"
                    onClick={() => setIsHistoryOpen(true)}
                    aria-label="Chat history"
                    title="View conversation history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    aria-label={isFullScreen ? "Exit full screen" : "Full screen"}
                    title={isFullScreen ? "Exit full screen" : "Full screen"}
                  >
                    {isFullScreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={toggleChat}
                    aria-label="Close"
                    title="Close chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className={`${isFullScreen ? "flex-grow" : "h-96"} overflow-y-auto mb-4 flex-1 px-1`}>
                {/* Show history view when isHistoryOpen is true */}
                {isHistoryOpen ? (
                  <HistoryView 
                    onSelectConversation={handleSelectConversation}
                    onBack={() => setIsHistoryOpen(false)}
                    activeConversationId={conversationId}
                  />
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <motion.svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-12 w-12 mx-auto mb-2 text-gray-400"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </motion.svg>
                    <motion.p 
                      className="text-sm"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      Ask me about restaurants, food recommendations, or help with your orders!
                    </motion.p>
                    
                    {/* Initial suggestion chips */}
                    <div className="mt-4">
                      <SuggestionChips 
                        suggestions={suggestions} 
                        onSelect={handleChipSelect} 
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Message bubbles */}
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        className={`mb-3 ${message.isUser ? "self-end" : "self-start"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Show message tool history if this is a non-user message with tool use */}
                        {!message.isUser && message.hasToolUse && message.id && messageToolHistory[message.id] && (
                          <MessageToolHistory toolHistory={messageToolHistory[message.id]} />
                        )}
                        
                        {/* Show reasoning steps if available */}
                        {!message.isUser && message.reasoningSteps && message.reasoningSteps.length > 0 && (
                          <ReasoningSteps steps={message.reasoningSteps} />
                        )}
                        
                        <div className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                          {!message.isUser && (
                            <div className="mr-2 self-end">
                              <motion.img
                                src="https://img.icons8.com/?size=512&id=M8M9YjBrtUkd&format=png"
                                alt="AI Assistant"
                                className="w-7 h-7"
                                animate={{ y: [0, -5, 0] }}
                                transition={{ 
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-lg max-w-[85%] ${
                              message.isUser
                                ? "message-bubble-user-enhanced text-white rounded-br-none"
                                : "message-bubble-assistant-enhanced text-gray-800 rounded-bl-none"
                            } ${message.error ? "bg-red-50 border border-red-100 text-red-600" : ""}`}
                          >
                            {message.image && (
                              <div className="mb-2">
                                <img 
                                  src={message.image} 
                                  alt="Uploaded" 
                                  className="rounded max-w-full max-h-32 mb-1" 
                                />
                              </div>
                            )}
                            
                            {/* Use our new EnhancedMessage component instead of ReactMarkdown directly */}
                            {message.isUser ? (
                              <div className="markdown-content">
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                              </div>
                            ) : (
                              <EnhancedMessage 
                                text={typeof message.text === 'string' 
                                      ? message.text 
                                      : Array.isArray(message.text)
                                        ? message.text.map(item => typeof item === 'string' 
                                            ? item 
                                            : item?.text || JSON.stringify(item)).join('\n\n')
                                        : JSON.stringify(message.text)
                                     }
                                isUser={false}
                              />
                            )}

                            <div className="text-xs text-right mt-1 opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Structured data renders between message segments - For backward compatibility */}
                        {!message.isUser && message.structuredData && message.structuredData.length > 0 && (
                          <div className="cards-container w-full my-3 animate-cards-entrance">
                            {message.structuredData.map((item, idx) => (
                              <motion.div 
                                key={idx}
                                className="card-wrapper mb-3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 * idx }}
                                whileHover={{ 
                                  y: -4,
                                  boxShadow: "0 12px 25px rgba(0, 0, 0, 0.07)",
                                  transition: { duration: 0.2 }
                                }}
                              >
                                {renderStructuredData(item.type, item.data)}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {/* Contextual suggestion chips */}
                    {!isLoading && suggestions.length > 0 && !showRefundChips && (
                      <div className="mt-4 mb-2">
                        <SuggestionChips 
                          suggestions={suggestions} 
                          onSelect={handleChipSelect} 
                        />
                      </div>
                    )}
                    
                    {/* Show refund reason suggestion chips when needed */}
                    {showRefundChips && !isLoading && (
                      <motion.div 
                        className="mt-4 mb-3"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-2 text-sm text-gray-600 font-medium">
                          Select a reason for your refund request:
                        </div>
                        <RefundSuggestionChips onSelect={handleChipSelect} />
                      </motion.div>
                    )}
                  </div>
                )}
                
                {/* Thinking indicator */}
                <AnimatePresence>
                  {thinking && <ThinkingIndicator thinking={thinking} />}
                </AnimatePresence>
                
                {/* Live tool execution indicator (only during active processing) */}
                <AnimatePresence>
                  {toolExecution && (
                    <ToolExecutionIndicator 
                      toolExecution={toolExecution} 
                      toolHistory={toolHistory} 
                      isCollapsed={processCollapsed}
                      onToggle={toggleProcess}
                    />
                  )}
                </AnimatePresence>
                
                {/* Loading indicator */}
                {isLoading && !thinking && !toolExecution && (
                  <motion.div 
                    className="flex justify-center items-center py-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="dot-flashing"></div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              <div className="mt-4 relative">
                <div className="glass-panel-enhanced rounded-full flex items-center pr-1 focus-within:ring-2 focus-within:ring-orange-400 focus-within:shadow-lg transition-all duration-300">
                  <motion.button 
                    className="text-gray-500 hover:text-orange-500 p-2.5" 
                    onClick={() => document.getElementById('image-upload').click()}
                    title="Upload image"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </motion.button>
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent py-3 px-3 focus:outline-none text-gray-700"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  <motion.button
                    className={`ml-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full p-2.5 shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleSendMessage()}
                    disabled={isLoading}
                    whileHover={{ scale: 1.05, boxShadow: "0 4px 10px -1px rgba(252, 128, 25, 0.5)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </motion.button>
                </div>
                
                {/* Subtle glow effect under input */}
                <div className="absolute -bottom-2 left-1/2 w-1/2 h-1 bg-orange-500/20 blur-md rounded-full transform -translate-x-1/2"></div>
              </div>
              
              {/* Optional styling for loading animation */}
              <style jsx="true">{`
                .dot-flashing {
                  position: relative;
                  width: 10px;
                  height: 10px;
                  border-radius: 5px;
                  background-color: #9880ff;
                  color: #9880ff;
                  animation: dot-flashing 1s infinite linear alternate;
                  animation-delay: 0.5s;
                }
                .dot-flashing::before, .dot-flashing::after {
                  content: '';
                  display: inline-block;
                  position: absolute;
                  top: 0;
                }
                .dot-flashing::before {
                  left: -15px;
                  width: 10px;
                  height: 10px;
                  border-radius: 5px;
                  background-color: #9880ff;
                  color: #9880ff;
                  animation: dot-flashing 1s infinite alternate;
                  animation-delay: 0s;
                }
                .dot-flashing::after {
                  left: 15px;
                  width: 10px;
                  height: 10px;
                  border-radius: 5px;
                  background-color: #9880ff;
                  color: #9880ff;
                  animation: dot-flashing 1s infinite alternate;
                  animation-delay: 1s;
                }
                
                @keyframes dot-flashing {
                  0% {
                    background-color: #9880ff;
                  }
                  50%, 100% {
                    background-color: rgba(152, 128, 255, 0.2);
                  }
                }
              `}</style>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Conversation History is now integrated directly in the chat panel */}
    </>
  );
};

export default ChatUI;
