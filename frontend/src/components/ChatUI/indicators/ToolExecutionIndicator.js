import React from 'react';
import { motion } from 'framer-motion';

/**
 * Shows the execution status of tools with a timeline of previous tool executions
 * Can be collapsed/expanded
 */
const ToolExecutionIndicator = ({ toolExecution, toolHistory = [], isCollapsed = false, onToggle }) => {
  // Keep track of progress animation for active tools - moved outside conditional
  const [progress, setProgress] = React.useState(0);
  
  // Progress animation for active tools - moved outside conditional
  React.useEffect(() => {
    let interval;
    if (toolExecution && toolExecution.status === 'started') {
      // Reset progress when a new tool execution starts
      setProgress(0);
      
      // Animate progress from 0 to 80% (we don't go to 100% until complete)
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(interval);
            return 80;
          }
          return prev + 2;
        });
      }, 100);
    } else if (toolExecution && toolExecution.status === 'completed') {
      // When complete, jump to 100%
      setProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [toolExecution]);
  
  // Early return after hooks have been called
  if (!toolExecution && (!toolHistory || toolHistory.length === 0)) return null;
  
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
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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

  return (
    <motion.div 
      className="p-4 bg-white border-l-4 border-indigo-500 rounded-xl mb-3 text-sm shadow-sm relative overflow-hidden"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Progress bar for active tools */}
      {toolExecution && toolExecution.status === 'started' && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"
          style={{ width: `${progress}%` }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut" }}
        />
      )}
      
      {/* Success complete bar animation */}
      {toolExecution && toolExecution.status === 'completed' && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-600"
          style={{ width: '100%' }}
          initial={{ width: `${progress < 100 ? progress : 80}%` }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Error bar for failed tools */}
      {toolExecution && toolExecution.status === 'error' && (
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-500 to-red-600 w-full" />
      )}
      <div className="flex items-center justify-between cursor-pointer pb-2" onClick={onToggle}>
        <div className="flex items-center">
          <span className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 flex items-center justify-center text-white mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </span>
          <motion.span 
            className="font-medium text-indigo-700"
            animate={{ 
              color: toolExecution?.status === 'started' ? 
                ['#4f46e5', '#818cf8', '#4f46e5'] : undefined 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5
            }}
          >
            {toolExecution?.status === 'started' ? 'Processing...' : 'Agent Processing Steps'}
          </motion.span>
        </div>
        <div className="text-gray-500">
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>
      </div>
      
      {!isCollapsed && toolHistory.length > 0 && (
        <div className="mt-3 mb-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Tool Execution Timeline</div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute h-full w-0.5 bg-gray-200 left-2"></div>
            
            {/* Timeline items */}
            <div className="space-y-2 ml-5">
              {toolHistory.map((tool, index) => (
                <motion.div 
                  key={index} 
                  className={`flex items-center ${getStatusColor(tool.status)}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-1">
                    <div className={`w-4 h-4 rounded-full border-2 border-white ${getBgColor(tool.status)} flex items-center justify-center`}>
                      {getStatusIcon(tool.status)}
                    </div>
                  </div>
                  
                  <div className="text-xs">
                    <span className="font-medium">{tool.toolName || 'Tool'}</span>
                    <span className="ml-1 text-gray-500">{tool.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {toolExecution && (
      <div>
        {/* Active tool highlighted box for active/running tool */}
        <div 
          className={`font-bold mb-1 flex items-center rounded-lg p-2 ${
            toolExecution.status === 'started' ? 'bg-blue-50 border border-blue-100' : 
            toolExecution.status === 'completed' ? 'bg-green-50 border border-green-100' : 
            toolExecution.status === 'error' ? 'bg-red-50 border border-red-100' : ''
          }`}
        >
          <span className="inline-block mr-2">{getStatusIcon(toolExecution.status)}</span>
          <div className="flex flex-col flex-grow">
            <div className="flex items-center justify-between">
              <span className={getStatusColor(toolExecution.status)}>
                Tool: {toolExecution.toolName || 'Unknown'}
              </span>
              {toolExecution.status === 'started' && (
                <motion.span 
                  className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Running
                </motion.span>
              )}
              {toolExecution.status === 'completed' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Completed
                </span>
              )}
              {toolExecution.status === 'error' && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Failed
                </span>
              )}
            </div>
            {toolExecution.status === 'started' && toolExecution.input && (
              <div className="text-xs font-normal text-gray-500 mt-0.5">
                {Object.entries(toolExecution.input).map(([key, value]) => (
                  <span key={key} className="mr-2">
                    {key}: <span className="text-gray-700">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`whitespace-pre-wrap p-3 rounded border ${
          toolExecution.status === 'completed' ? 'bg-green-50 border-green-200 text-green-800' : 
          toolExecution.status === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
          'bg-white border-gray-100 text-gray-600'
        }`}>
          {toolExecution.data}
        </div>
      </div>
      )}
    </motion.div>
  );
};

export default ToolExecutionIndicator;
