import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Displays the tool execution history for a specific message
 * Collapsible component that shows the tools used by the AI assistant
 */
const MessageToolHistory = ({ toolHistory = [], isCollapsed: initialCollapsed = true }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  if (!toolHistory || toolHistory.length === 0) return null;
  
  // Process history to ensure we have proper tool names
  const processedHistory = toolHistory.map(tool => {
    // If tool has no name, try to generate a user-friendly one
    if (!tool.toolName || tool.toolName === 'unknown_tool') {
      // Try to extract from data string if it matches patterns
      if (tool.data && typeof tool.data === 'string') {
        const searchingMatch = tool.data.match(/^(Searching|Finding|Looking|Retrieving|Processing) .+?\.{3}$/);
        const completedMatch = tool.data.match(/^(Found|Retrieved|Completed|Processed) .+$/);
        
        if (searchingMatch || completedMatch) {
          // The data already contains a user-friendly description, so keep it
          return {
            ...tool,
            // Keep original toolName but ensure we have something to display
            displayName: tool.data.split(' ')[0]  // Just use the first word as a fallback name
          };
        }
      }
    }
    
    // If we have a toolName, create a display version
    if (tool.toolName) {
      return {
        ...tool,
        displayName: tool.toolName
          .replace(/^unknown_/, '')
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()
          .replace(/^\w/, c => c.toUpperCase())
          .trim() || 'Tool'
      };
    }
    
    // Fallback
    return {
      ...tool,
      displayName: 'Processing'
    };
  });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'started':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'started':
        return (
          <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  const getBgColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };
  
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  return (
    <div className="mb-2 mt-1 text-xs rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 shadow-sm">
      <button 
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between p-2 rounded-t-lg bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors"
      >
        <div className="flex items-center">
          <span className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 flex items-center justify-center text-white mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-medium text-indigo-700">
            Assistant used {toolHistory.length} tool{toolHistory.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="text-gray-500">
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="p-3 border-t border-gray-100"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute h-full w-0.5 bg-gray-200 left-2"></div>
              
              {/* Timeline items */}
              <div className="space-y-2 ml-5">
                {toolHistory.map((tool, index) => (
                  <motion.div 
                    key={index} 
                    className={`flex items-center ${getStatusColor(tool.status)}`}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-1">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 border-white ${getBgColor(tool.status)} flex items-center justify-center`}>
                        {getStatusIcon(tool.status)}
                      </div>
                    </div>
                    
                    <div className="text-xs ml-1">
                      <span className="font-medium">{tool.displayName || tool.toolName || 'Tool'}</span>
                      <span className="ml-1 text-gray-500">{tool.status}</span>
                      {tool.data && (
                        <div className="mt-1 mb-2 text-gray-600 text-xs whitespace-pre-wrap bg-gray-50 p-1.5 rounded border border-gray-100 max-h-24 overflow-y-auto">
                          {tool.data}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageToolHistory;
