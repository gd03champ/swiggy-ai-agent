import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ConversationHistory component displays past conversations and allows loading them
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the history panel is open
 * @param {function} props.onClose - Function to call when closing the panel
 * @param {function} props.onSelectConversation - Function to call when a conversation is selected
 * @param {string} props.userId - Optional user ID to filter conversations
 * @param {string} props.activeConversationId - ID of the currently active conversation
 */
const ConversationHistory = ({ 
  isOpen, 
  onClose, 
  onSelectConversation,
  userId = null,
  activeConversationId = null 
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
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
          limit: 10,
          offset: newPage * 10,
          sort_by: 'timestamp',
          sort_order: -1
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (reset) {
        setConversations(data.conversations || []);
      } else {
        setConversations(prev => [...prev, ...(data.conversations || [])]);
      }
      
      setHasMore((data.conversations || []).length === 10);
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
  
  // Fetch conversations when the panel opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations(true);
    }
  }, [isOpen, userId]);
  
  // Format a timestamp for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-96 h-full bg-white/80 backdrop-blur-md shadow-xl rounded-l-xl overflow-hidden flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white flex justify-between items-center shadow-md">
              <h2 className="text-lg font-medium">Conversation History</h2>
              <button
                className="text-white hover:text-gray-100 transition-colors"
                onClick={onClose}
                aria-label="Close panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg mb-3">
                  <p className="text-sm font-medium">Failed to load conversations</p>
                  <p className="text-xs opacity-75">{error}</p>
                </div>
              )}
              
              {conversations.length === 0 && !loading && !error ? (
                <div className="text-center text-gray-500 p-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm mt-1">Start a new chat to see it here</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {conversations.map((conversation) => (
                    <motion.div
                      key={conversation._id || conversation.session_id}
                      className={`p-3 rounded-lg cursor-pointer shadow-sm transition-all ${
                        activeConversationId === conversation.session_id
                          ? 'bg-orange-100 border-orange-300 border'
                          : 'bg-white hover:bg-gray-50 border border-gray-100'
                      }`}
                      onClick={() => onSelectConversation(conversation)}
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="text-sm font-medium line-clamp-2">
                        {conversation.summary || 'Conversation'}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {conversation.message_count || 0} messages
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(conversation.start_time)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {hasMore && (
                    <div className="text-center p-2">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className={`text-sm px-4 py-1 rounded-full border ${
                          loading
                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {loading ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {loading && conversations.length === 0 && (
                <div className="flex justify-center items-center p-6">
                  <div className="dot-pulse"></div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      <style jsx="true">{`
        .dot-pulse {
          position: relative;
          left: -9999px;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: #FB923C;
          color: #FB923C;
          box-shadow: 9999px 0 0 -5px;
          animation: dot-pulse 1.5s infinite linear;
          animation-delay: 0.25s;
        }
        .dot-pulse::before, .dot-pulse::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: #FB923C;
          color: #FB923C;
        }
        .dot-pulse::before {
          box-shadow: 9969px 0 0 -5px;
          animation: dot-pulse-before 1.5s infinite linear;
          animation-delay: 0s;
        }
        .dot-pulse::after {
          box-shadow: 10029px 0 0 -5px;
          animation: dot-pulse-after 1.5s infinite linear;
          animation-delay: 0.5s;
        }
        @keyframes dot-pulse-before {
          0% { box-shadow: 9969px 0 0 -5px; }
          30% { box-shadow: 9969px 0 0 2px; }
          60%, 100% { box-shadow: 9969px 0 0 -5px; }
        }
        @keyframes dot-pulse {
          0% { box-shadow: 9999px 0 0 -5px; }
          30% { box-shadow: 9999px 0 0 2px; }
          60%, 100% { box-shadow: 9999px 0 0 -5px; }
        }
        @keyframes dot-pulse-after {
          0% { box-shadow: 10029px 0 0 -5px; }
          30% { box-shadow: 10029px 0 0 2px; }
          60%, 100% { box-shadow: 10029px 0 0 -5px; }
        }
      `}</style>
    </AnimatePresence>
  );
};

export default ConversationHistory;
