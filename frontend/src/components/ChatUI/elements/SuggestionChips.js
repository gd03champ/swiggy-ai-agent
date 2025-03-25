import React from 'react';
import { motion } from 'framer-motion';

/**
 * Displays clickable suggestion chips for quick responses with enhanced animations
 */
const SuggestionChips = ({ suggestions = [], onSelect }) => {
  if (!suggestions.length) return null;
  
  // Spring animation for the container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
      },
    },
  };
  
  // Animation variants for individual chips
  const chipVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 150,
        damping: 15
      } 
    }
  };
  
  return (
    <motion.div 
      className="flex flex-wrap gap-2 mt-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          className="glass-panel-enhanced hover:bg-orange-50 text-gray-700 hover:text-orange-600 shadow-sm rounded-full px-4 py-2 text-xs font-medium transition-all border border-orange-100/30"
          onClick={() => onSelect(suggestion)}
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 4px 12px -1px rgba(255, 140, 0, 0.2)",
            y: -2
          }}
          whileTap={{ scale: 0.95 }}
          variants={chipVariants}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
};

export default SuggestionChips;
