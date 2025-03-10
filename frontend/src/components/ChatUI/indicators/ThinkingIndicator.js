import React from 'react';
import { motion } from 'framer-motion';

/**
 * Animated thinking indicator showing the AI's thinking process
 */
const ThinkingIndicator = ({ thinking }) => {
  if (!thinking || !thinking.length) return null;
  
  // Clean up JSON in thinking text
  const cleanedThinking = thinking
    // Fix escaped characters
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"');
  
  // Split thinking into lines for animation
  const thinkingLines = cleanedThinking.split('\n').filter(line => line.trim());
  
  return (
    <motion.div 
      className="p-4 bg-white rounded-xl mb-3 text-sm border border-gray-100 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="font-bold text-indigo-600 mb-2 flex items-center">
        <span className="inline-flex mr-2 bg-gradient-to-r from-indigo-600 to-blue-500 p-1 rounded-full">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
            </svg>
          </motion.div>
        </span>
        <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Thinking...</span>
      </div>
      <div className="text-gray-700 whitespace-pre-wrap">
        {thinkingLines.map((line, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="mb-1 last:mb-0"
          >
            {line}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ThinkingIndicator;
