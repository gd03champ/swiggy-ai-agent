import React from 'react';
import { motion } from 'framer-motion';

/**
 * Displays clickable suggestion chips for quick responses
 */
const SuggestionChips = ({ suggestions = [], onSelect }) => {
  if (!suggestions.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          className="bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 border border-gray-100 shadow-sm rounded-full px-4 py-2 text-xs font-medium transition-all"
          onClick={() => onSelect(suggestion)}
          whileHover={{ scale: 1.05, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
};

export default SuggestionChips;
