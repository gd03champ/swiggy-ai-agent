/**
 * Event processors for handling different types of events from the chat stream
 */
import { getFriendlyToolDescription } from './toolMessages';
import { detectStructuredData } from './structuredDataProcessor';

/**
 * Process reasoning step events
 * @param {Object} data - The event data object
 * @param {Array} reasoningSteps - The collection of reasoning steps
 * @param {string} thinkingText - The current thinking text
 * @param {Function} setThinking - Function to update thinking state
 * @param {Function} setToolHistory - Function to update tool history
 * @param {Function} setToolExecution - Function to update current tool execution
 * @param {Function} setProcessCollapsed - Function to update process collapsed state
 * @returns {Object} Updated thinking text and reasoning steps
 */
export const processReasoningStep = (
  data, 
  reasoningSteps, 
  thinkingText,
  setThinking,
  setToolHistory,
  setToolExecution,
  setProcessCollapsed
) => {
  console.log("Received reasoning step:", data);
  
  // Store the original reasoning step for attaching to the final message
  reasoningSteps.push(data.data);
  
  // Get original thought content
  let originalThought = data.data.thought;
  
  // Check if the thought contains tool_use information
  if (originalThought && typeof originalThought === 'string') {
    try {
      // Look for tool_use pattern in the thought
      if (originalThought.includes("'type': 'tool_use'") || 
          originalThought.includes('"type": "tool_use"')) {
        console.log("[TOOL USE DETECTED] Found tool_use in reasoning step");
        
        // Try to extract tool name and input
        let toolName = null;
        let toolInput = {};
        
        // Try to find the tool name
        const nameMatch = originalThought.match(/['"]name['"]: ['"]([^'"]+)['"]/);
        if (nameMatch && nameMatch[1]) {
          toolName = nameMatch[1];
          console.log("[TOOL USE DETECTED] Extracted tool name:", toolName);
          
          // Try to extract the json input
          const inputMatch = originalThought.match(/['"]partial_json['"]: ['"]({[^'"]+})['"]/) || 
                            originalThought.match(/['"]input['"]: ({[^}]+})/);
          
          if (inputMatch && inputMatch[1]) {
            try {
              // Clean up the JSON string if needed
              const cleanedJson = inputMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
                
              toolInput = JSON.parse(cleanedJson);
              console.log("[TOOL USE DETECTED] Parsed tool input:", toolInput);
            } catch (e) {
              console.error("Error parsing tool input:", e);
            }
          }
          
          // If we found both name and potentially input, create a preliminary tool execution
          if (toolName) {
            // Create a user-friendly description based on the tool name
            let friendlyDescription = getFriendlyToolDescription(toolName, toolInput);
            
            // Add early tool to history with 'started' status
            const prelimTool = {
              id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              toolName: toolName,
              status: 'started',
              data: friendlyDescription || `Using ${toolName}...`,
              input: toolInput || {}
            };
            
            // Add to history and set as current tool execution
            setToolHistory(prev => [...prev, prelimTool]);
            
            // Make sure the tool execution panel is visible (not collapsed)
            setProcessCollapsed(false);
            
            // Set current tool execution
            setToolExecution(prelimTool);
          }
        }
      }
    } catch (e) {
      console.error("Error parsing tool_use from reasoning step:", e);
    }
  }
  
  // DIRECT APPROACH: Just extract the human-readable part
  let cleanThought = originalThought;
  
  if (cleanThought && typeof cleanThought === 'string') {
    // Cut off at first sign of JSON structure or special characters
    const jsonMarkers = ["', '", "}, {", "{'", "{\"", "[{"];
    let cutoffIndex = cleanThought.length;
    
    // Find the first JSON marker
    for (const marker of jsonMarkers) {
      const index = cleanThought.indexOf(marker);
      if (index !== -1 && index < cutoffIndex) {
        cutoffIndex = index;
      }
    }
    
    // Get just the clean text part
    cleanThought = cleanThought.substring(0, cutoffIndex).trim();
    
    // Special handling for "Invoking: x with y" pattern
    if (originalThought.includes("Invoking:")) {
      const invokeMatch = originalThought.match(/Invoking:\s*`([^`]+)`\s*with\s*`\{([^}]+)\}`/);
      if (invokeMatch) {
        const [match, toolName, params] = invokeMatch;
        // Add this in a clean format
        cleanThought += `\n\nUsing ${toolName} with ${params.trim()}`;
      }
    }
    
    // Handle "responded" by extracting any text content
    if (originalThought.includes("responded:") && originalThought.includes("'type': 'text'")) {
      const textMatch = originalThought.match(/'text':\s*[\"\'](.*?)[\"\'](?:,|\s|\})/);
      if (textMatch && textMatch[1]) {
        cleanThought += "\n\n" + textMatch[1].trim();
      }
    }
    
    // Fix any escaped characters
    cleanThought = cleanThought
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    
    // Provide a fallback if empty
    if (!cleanThought.trim()) {
      cleanThought = `Step ${data.data.step}`;
    }
  }
  
  // Add the cleaned reasoning step to the thinking text
  const updatedThinkingText = thinkingText + `\n\nStep ${data.data.step}: ${cleanThought}`;
  setThinking(updatedThinkingText);

  return { 
    thinkingText: updatedThinkingText, 
    reasoningSteps 
  };
};

/**
 * Process agent action events which indicate tool execution
 * @param {Object} data - The event data
 * @param {Array} currentToolHistory - The current tool history
 * @param {Function} setToolHistory - Function to update tool history
 * @param {Function} setToolExecution - Function to update current tool execution
 * @param {Function} setProcessCollapsed - Function to update process collapsed state
 * @returns {Array} Updated tool history
 */
export const processAgentAction = (
  data, 
  currentToolHistory, 
  setToolHistory, 
  setToolExecution, 
  setProcessCollapsed
) => {
  console.log("[DEBUG CRITICAL] Received agent_action event:", data);
  
  // Check if we have the necessary info to create a tool execution indicator
  if (data.tool_name) {
    const toolName = data.tool_name;
    const toolInput = data.input || {};
    
    // Get user-friendly description for this tool
    let friendlyDescription = getFriendlyToolDescription(toolName, toolInput);
    
    // Create a new tool execution object
    const newTool = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      toolName: toolName,
      status: 'started',
      data: friendlyDescription || data.data || `Using ${toolName}...`,
      input: toolInput,
      originalData: data.data,
      rawEvent: data
    };
    
    // Update tool history
    const updatedToolHistory = [...currentToolHistory, newTool];
    setToolHistory(updatedToolHistory);
    
    // Make sure the tool execution panel is visible (not collapsed)
    setProcessCollapsed(false);
    
    // Set current tool execution
    setToolExecution(newTool);
    
    console.log("[DEBUG CRITICAL] Created tool execution from agent_action:", newTool);
    
    return updatedToolHistory;
  }
  
  return currentToolHistory;
};

/**
 * Process structured data events
 * @param {Object} data - The event data
 * @param {Array} structuredDataItems - The current structured data items
 * @returns {Array} Updated structured data items
 */
export const processStructuredData = (data, structuredDataItems) => {
  console.log("[DEBUG CRITICAL] Received structured_data event:", data);
  
  // ENHANCED DEBUG: Log information about the event
  if (data.data) {
    console.log("[DEBUG STRUCTURED] Event data type:", typeof data.data);
    console.log("[DEBUG STRUCTURED] Keys in event data:", Object.keys(data.data));
    
    const structuredItem = detectStructuredData(data.data);
    
    // Add to our collection if we found something
    if (structuredItem) {
      structuredDataItems.push(structuredItem);
      console.log("[DEBUG CRITICAL] Added structured item to collection. Total items:", structuredDataItems.length);
    }
  }
  
  return structuredDataItems;
};
