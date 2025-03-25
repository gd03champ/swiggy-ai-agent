import React from 'react';
import { motion } from 'framer-motion';

/**
 * Component that displays suggestion chips for refund reasons
 * to make it easier for users to provide refund reasons
 */
const RefundSuggestionChips = ({ onSelect }) => {
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
  
  // Common refund reasons for food delivery
  const refundReasons = [
    { id: 'quality', label: 'Food quality issue' },
    { id: 'wrong_items', label: 'Wrong items delivered' },
    { id: 'missing', label: 'Missing items' },
    { id: 'damaged', label: 'Damaged packaging' },
    { id: 'late', label: 'Late delivery' },
    { id: 'cold', label: 'Food was cold' },
  ];

  return (
    <motion.div 
      className="flex flex-wrap gap-2 mb-4 mt-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {refundReasons.map((reason, index) => (
        <motion.button
          key={reason.id}
          onClick={() => onSelect(reason.label)}
          className="glass-panel-enhanced hover:bg-orange-50 text-gray-700 hover:text-orange-600 
                   px-3 py-1.5 text-sm rounded-full shadow-sm border border-orange-100/30 transition-all"
          whileHover={{ 
            scale: 1.05, 
            boxShadow: "0 4px 12px -1px rgba(255, 140, 0, 0.2)",
            y: -2
          }}
          whileTap={{ scale: 0.95 }}
          variants={chipVariants}
        >
          {reason.label}
        </motion.button>
      ))}
    </motion.div>
  );
};

export default RefundSuggestionChips;
