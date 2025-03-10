import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * HistoryView component displays past conversations inline within the chat panel
 * 
 * @param {Object} props - Component props
 * @param {function} props.onSelectConversation - Function to call when a conversation is selected
 * @param {function} props.onBack - Function to call when the back button is clicked
 * @param {string} props.userId - Optional user ID to filter conversations
 * @param {string} props.activeConversationId - ID of the currently active conversation
 */
const HistoryView = ({ 
  onSelectConversation,
  onBack,
  userId = null,
  activeConversationId = null 
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Function to delete a conversation
  const deleteConversation = async (sessionId) => {
    try {
      setLoading(true);
      setDeleteStatus(null);
      
      const response = await fetch(`http://localhost:8000/api/conversation/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`);
      }
      
      // Remove the deleted conversation from the state
      setConversations(prevConversations => 
        prevConversations.filter(c => c.session_id !== sessionId)
      );
      
      // Show success message
      setDeleteStatus({success: true, message: "Conversation deleted successfully"});
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err.message);
      setDeleteStatus({success: false, message: `Failed to delete: ${err.message}`});
    } finally {
      setLoading(false);
    }
  };
  
  const fetchConversations = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const newPage = reset ? 0 : page;
      
      const response = await fetch(`http://localhost:8000/api/conversation/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          limit: 15,
          offset: newPage * 15,
          sort_by: 'timestamp',
          sort_order: -1
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API RESPONSE (raw):", data);
      
      // Create mock data for testing if no conversations
      if (!data.conversations || data.conversations.length === 0) {
        console.log("No conversations found, using mock data");
        const mockConversations = [
          {
            _id: "mock123",
            session_id: "mock123",
            summary: "Test conversation 1",
            message_count: 5,
            start_time: new Date().toISOString(),
          },
          {
            _id: "mock456",
            session_id: "mock456", 
            summary: "Test conversation 2",
            message_count: 3,
            start_time: new Date(Date.now() - 24*60*60*1000).toISOString(),
          }
        ];
        
        if (reset) {
          setConversations(mockConversations);
          console.log("Set mock conversations:", mockConversations);
        } else {
          setConversations(prev => [...prev, ...mockConversations]);
        }
      } else {
        console.log("CONVERSATIONS from API:", data.conversations);
        
        // Process the conversations to ensure they have the necessary fields
        const processedConversations = (data.conversations || []).map(conv => {
          // Fix case-sensitivity issues - MongoDB data might have SessionId (uppercase S)
          // Handle all possible ID field variations
          const convId = conv.session_id || conv.SessionId || conv._id || null;
          
          console.log("Processing conversation:", conv);
          console.log("- ID found:", convId);
          
          // Create a standardized conversation object with consistent field names
          return {
            ...conv,
            session_id: convId, // Normalize to lowercase session_id for our frontend code
            SessionId: convId, // Keep the uppercase version too for compatibility
            summary: conv.summary || 
                     (conv.messages && conv.messages[0]?.text?.substring(0, 50) + "...") || 
                     'Conversation',
            message_count: conv.message_count || (conv.messages?.length) || 0,
            start_time: conv.start_time || conv.timestamp || new Date().toISOString()
          };
        });
        
        console.log("PROCESSED conversations:", processedConversations);
        
        if (reset) {
          setConversations(processedConversations);
        } else {
          setConversations(prev => [...prev, ...processedConversations]);
        }
      }
      
      setHasMore((data.conversations || []).length === 15);
      setPage(reset ? 1 : newPage + 1);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchConversations(false);
    }
  };
  
  // Fetch conversations when the component mounts
  useEffect(() => {
    fetchConversations(true);
  }, [userId]);
  
  // Format a timestamp for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = new Date(timestamp);
      
      // If it's today, just show the time
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Otherwise show date and time
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-100">
        <h2 className="text-lg font-medium text-orange-600">Recent Conversations</h2>
        <button
          className="p-1 rounded-full hover:bg-orange-100 text-orange-600 transition-all"
          onClick={onBack}
          aria-label="Back to chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg shadow-sm">
            <p className="text-sm font-medium">Failed to load conversations</p>
            <p className="text-xs opacity-80">{error}</p>
            <button 
              onClick={() => fetchConversations(true)}
              className="mt-2 text-xs bg-white border border-red-300 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {conversations.length === 0 && !loading && !error ? (
          <div className="text-center text-gray-500 py-10 mt-5">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 mx-auto mb-4 text-gray-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-lg font-medium">No conversation history yet</p>
            <p className="text-sm mt-1 max-w-xs mx-auto">
              Your chat history will appear here once you start having conversations
            </p>
          </div>
        ) : (
          <div className="space-y-3 px-1">
            {conversations.map((conversation) => (
              <motion.div
                key={conversation._id || conversation.session_id}
                className={`p-4 rounded-xl backdrop-blur-sm transition-all ${
                  activeConversationId === conversation.session_id
                    ? 'bg-orange-100/80 border-orange-200 border shadow-sm'
                    : 'bg-white/50 hover:bg-white/70 border border-gray-100 hover:border-orange-100'
                }`}
                whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}
              >
                {/* Make the main content clickable but not the delete button */}
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    // Log for debugging
                    console.log("Selecting conversation full object:", conversation);
                    
                    // Handle different possible ID field names
                    const convId = conversation.session_id || 
                                  conversation._id || 
                                  (typeof conversation === 'string' ? conversation : null);
                    
                    if (convId) {
                      console.log("Found conversation ID:", convId);
                      // Create a normalized conversation object with session_id
                      const normalizedConv = {
                        ...conversation,
                        session_id: convId
                      };
                      onSelectConversation(normalizedConv);
                    } else {
                      console.error("Invalid conversation - couldn't find ID field:", conversation);
                    }
                  }}
                >
                  <div className="text-gray-800 font-medium line-clamp-1">
                    {conversation.summary || 'Conversation'}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center text-xs text-gray-500 bg-gray-100/60 px-2 py-1 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {conversation.message_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(conversation.start_time)}
                    </div>
                  </div>
                </div>
                
                {/* Delete button */}
                <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onClick
                      
                      // Extract ID using same logic as the click handler
                      const convId = conversation.session_id || 
                                  conversation._id || 
                                  (typeof conversation === 'string' ? conversation : null);
                      
                      if (convId && window.confirm("Delete this conversation?")) {
                        console.log("Attempting to delete conversation with ID:", convId);
                        deleteConversation(convId);
                      } else if (!convId) {
                        console.error("Cannot delete conversation - no valid ID found");
                        setError("Cannot delete - invalid conversation ID");
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center py-1 px-2 rounded hover:bg-red-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
            
            {hasMore && (
              <div className="text-center p-3">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className={`py-2 px-4 rounded-full text-sm transition-colors ${
                    loading
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 text-orange-600 hover:from-orange-500/20 hover:to-orange-600/20'
                  }`}
                >
                  {loading ? 'Loading...' : 'Load more conversations'}
                </button>
              </div>
            )}
          </div>
        )}
        
        {loading && conversations.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <div className="pulse-loader"></div>
          </div>
        )}
      </div>
      
      {/* Stylized pulse loader */}
      <style jsx="true">{`
        .pulse-loader {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(255, 136, 0, 0.2);
          animation: pulse 1.2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default HistoryView;
