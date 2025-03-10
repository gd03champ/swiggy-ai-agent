import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Displays the step-by-step reasoning from the LLM agent
 * Collapsible component that shows the chain-of-thought reasoning process with properly formatted JSON
 */
const ReasoningSteps = ({ steps = [], isCollapsed: initialCollapsed = true }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  if (!steps || steps.length === 0) return null;
  
  // Clean up reasoning steps with better JSON handling
  const processedSteps = steps.map(step => {
    let { thought } = step;
    
    // Process thought content if it exists
    if (thought && typeof thought === 'string') {
      // DIRECT APPROACH: Just extract the human-readable part
      // We know reasoning steps typically start with human text followed by JSON stuff
      
      // Cut off at first sign of JSON structure or special characters
      const jsonMarkers = ["', '", "}, {", "{'", "{\"", "[{"];
      let cutoffIndex = thought.length;
      
      // Find the first JSON marker
      for (const marker of jsonMarkers) {
        const index = thought.indexOf(marker);
        if (index !== -1 && index < cutoffIndex) {
          cutoffIndex = index;
        }
      }
      
      // Get just the clean text part
      let cleanThought = thought.substring(0, cutoffIndex).trim();
      
      // Special handling for "Invoking: x with y" pattern - we want to keep this
      if (thought.includes("Invoking:")) {
        const invokeMatch = thought.match(/Invoking:\s*`([^`]+)`\s*with\s*`\{([^}]+)\}`/);
        if (invokeMatch) {
          const [match, toolName, params] = invokeMatch;
          // Add this information in a clean format
          cleanThought += `\n\nUsing ${toolName} with ${params.trim()}`;
        }
      }
      
      // Handle "responded" by extracting text content if possible
      if (thought.includes("responded:") && thought.includes("'type': 'text'")) {
        // Extract text from response if possible
        const textMatch = thought.match(/'text':\s*[\"\'](.*?)[\"\'](?:,|\s|\})/);
        if (textMatch && textMatch[1]) {
          cleanThought += "\n\n" + textMatch[1].trim();
        }
      }
      
      // Clean up any remaining issues
      cleanThought = cleanThought
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      
      // If we've ended up with an empty string, provide a fallback
      if (!cleanThought.trim()) {
        cleanThought = "Step " + step.step;
      }
      
      // Update the thought with our clean version
      thought = cleanThought;
    }
    
    return {
      ...step,
      thought: thought || 'No details available'
    };
  });
  
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Swiggy color scheme
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  
  return (
    <div className="mb-2 mt-1 text-xs rounded-lg bg-white border border-gray-200 shadow-sm">
      {/* Header */}
      <button 
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between p-2 rounded-t-lg hover:bg-gray-50 transition-colors"
        style={{ background: "#FBFBFB" }}
      >
        <div className="flex items-center">
          <span 
            className="w-4 h-4 rounded-full flex items-center justify-center text-white mr-2"
            style={{ backgroundColor: SWIGGY_ORANGE }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-medium" style={{ color: SWIGGY_DARK_GRAY }}>
            Reasoning process ({steps.length} steps)
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
              <div 
                className="absolute h-full w-0.5 left-2"
                style={{ background: `linear-gradient(to bottom, ${SWIGGY_ORANGE}40, ${SWIGGY_ORANGE}80)` }}
              ></div>
              
              {/* Timeline items */}
              <div className="space-y-2 ml-5">
                {processedSteps.map((step, index) => (
                  <motion.div 
                    key={index} 
                    className="mb-3"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-1">
                      <div 
                        className="w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: SWIGGY_ORANGE }}
                      >
                        {step.step}
                      </div>
                    </div>
                    
                    <div className="text-xs ml-2">
                      <div className="font-medium mb-1" style={{ color: SWIGGY_DARK_GRAY }}>
                        Step {step.step}: Reasoning
                      </div>
                      <div className="mt-1 mb-2 text-gray-700 text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">
                        {step.thought}
                      </div>
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

export default ReasoningSteps;
