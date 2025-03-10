/**
 * Handlers for tool-related events from the chat stream
 */
import { getToolCompletionMessage, getFriendlyToolDescription } from './toolMessages';

/**
 * Process tool_start events
 * @param {Object} data - The event data object
 * @param {Array} currentToolHistory - Current tool history
 * @param {Function} setToolHistory - Function to update tool history
 * @param {Function} setToolExecution - Function to update current tool execution
 * @param {Function} setProcessCollapsed - Function to update process collapsed state
 * @returns {Array} Updated tool history
 */
export const processToolStart = (
  data,
  currentToolHistory,
  setToolHistory,
  setToolExecution,
  setProcessCollapsed
) => {
  console.log("Received tool_start event:", data);
  
  // Get tool name with better fallbacks
  let toolName = "Unknown Tool";
  if (data.tool_name) {
    toolName = data.tool_name;
    console.log("Using tool name from event:", toolName);
  } else if (typeof data.input === 'object' && data.input && data.input.tool) {
    toolName = data.input.tool;
    console.log("Using tool name from input object:", toolName);
  } else if (data.data && typeof data.data === 'string') {
    // Try to extract name from "Using X" pattern if present
    const match = data.data.match(/Using ([a-zA-Z0-9_]+)/);
    if (match && match[1]) {
      toolName = match[1];
      console.log("Extracted tool name from data string:", toolName);
    }
  }
  
  // Get user-friendly description based on the tool name
  let friendlyDescription = getFriendlyToolDescription(toolName, data.input);
  
  // Add tool to history with 'started' status
  const newTool = {
    id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Add unique ID for easy updating
    toolName: toolName,
    status: 'started',
    data: friendlyDescription || data.data,
    originalData: data.data,
    rawEvent: data, // Store the raw event for debugging
    input: data.input
  };
  
  const updatedToolHistory = [...currentToolHistory, newTool];
  setToolHistory(updatedToolHistory);
  
  // Make sure the tool execution panel is visible (not collapsed) when tools are running
  setProcessCollapsed(false);
  
  // Set current tool execution
  setToolExecution(newTool);

  return updatedToolHistory;
};

/**
 * Process tool_end events
 * @param {Object} data - The event data object
 * @param {Array} currentToolHistory - Current tool history
 * @param {Function} setToolHistory - Function to update tool history
 * @param {Function} setToolExecution - Function to update current tool execution
 * @returns {Array} Updated tool history
 */
export const processToolEnd = (
  data,
  currentToolHistory,
  setToolHistory,
  setToolExecution
) => {
  console.log("Received tool_end event:", data);
  
  // Get tool name with better fallbacks (similar to tool_start)
  let toolName = "Unknown Tool";
  let originalToolData = null;
  let toolInput = null;
  let toolId = null;
  
  // First try to get info from the history (most accurate for linking start and end)
  if (currentToolHistory.length > 0) {
    const lastTool = currentToolHistory[currentToolHistory.length - 1];
    toolName = lastTool.toolName;
    originalToolData = lastTool.originalData;
    toolInput = lastTool.input;
    toolId = lastTool.id;
    console.log("Using tool name from history:", toolName);
  } else if (data.tool_name) {
    // If no history, get name from event
    toolName = data.tool_name;
    console.log("Using tool name from event:", toolName);
  } else if (data.data && typeof data.data === 'string') {
    // Try to extract name from "Tool X completed!" pattern if present
    const match = data.data.match(/Tool ([a-zA-Z0-9_]+) completed/);
    if (match && match[1]) {
      toolName = match[1];
      console.log("Extracted tool name from data string:", toolName);
    }
  }
  
  // Create user-friendly completion message
  const completionMsg = getToolCompletionMessage(toolName, toolInput, data.output);
  
  let updatedToolHistory = currentToolHistory;

  // Update tool history status to 'completed'
  if (currentToolHistory.length > 0) {
    updatedToolHistory = [...currentToolHistory];
    const lastIndex = updatedToolHistory.length - 1;
    updatedToolHistory[lastIndex] = {
      ...updatedToolHistory[lastIndex],
      status: 'completed',
      data: completionMsg || data.data,
      originalData: originalToolData,
      output: data.output
    };
    setToolHistory(updatedToolHistory);
  } 
  
  // Update current tool execution
  setToolExecution({
    id: toolId,
    toolName: toolName,
    status: 'completed',
    data: completionMsg || data.data,
    originalData: originalToolData,
    output: data.output,
    rawEvent: data // Store the raw event for debugging
  });

  return updatedToolHistory;
};

/**
 * Process tool_error events
 * @param {Object} data - The event data object
 * @param {Array} currentToolHistory - Current tool history
 * @param {string} thinkingText - Current thinking text
 * @param {Function} setToolHistory - Function to update tool history
 * @param {Function} setToolExecution - Function to update current tool execution
 * @param {Function} setThinking - Function to update thinking text
 * @returns {Object} Updated tool history and thinking text
 */
export const processToolError = (
  data,
  currentToolHistory,
  thinkingText,
  setToolHistory,
  setToolExecution,
  setThinking
) => {
  console.log("Received tool_error event:", data);
  
  // Get tool name with better fallbacks (similar to tool_start/end)
  let toolName = "Unknown Tool";
  if (data.tool_name) {
    toolName = data.tool_name;
    console.log("Using tool name from event:", toolName);
  } else if (currentToolHistory.length > 0) {
    // Use the name from the last tool in history if available
    toolName = currentToolHistory[currentToolHistory.length - 1].toolName;
    console.log("Using tool name from history:", toolName);
  } else if (data.data && typeof data.data === 'string') {
    // Try to extract name from error message if it matches patterns
    const match = data.data.match(/Error executing ([a-zA-Z0-9_]+)/);
    if (match && match[1]) {
      toolName = match[1];
      console.log("Extracted tool name from error message:", toolName);
    }
  }
  
  let updatedToolHistory = currentToolHistory;
  // Update tool history
  if (currentToolHistory.length > 0) {
    updatedToolHistory = [...currentToolHistory];
    const lastIndex = updatedToolHistory.length - 1;
    updatedToolHistory[lastIndex] = {
      ...updatedToolHistory[lastIndex],
      status: 'error',
      error: data.data,
      output: data.output
    };
    setToolHistory(updatedToolHistory);
  } else {
    // If no tool history yet (rare case), create a new entry
    const errorTool = {
      toolName: toolName,
      status: 'error',
      error: data.data,
      output: data.output,
      rawEvent: data // Store the raw event for debugging
    };
    updatedToolHistory = [errorTool];
    setToolHistory(updatedToolHistory);
  }
  
  // Update current tool execution with error info
  setToolExecution({
    toolName: toolName,
    status: 'error',
    data: data.data,
    output: data.output,
    rawEvent: data // Store the raw event for debugging
  });
  
  let updatedThinkingText = thinkingText;
  // Append error info to thinking to make it visible to the user
  if (data.data && typeof data.data === 'string') {
    // Keep error info from the tool in the thinking text
    updatedThinkingText = thinkingText + `\n\n${data.data}`;
    setThinking(updatedThinkingText);
  }

  return { 
    toolHistory: updatedToolHistory, 
    thinkingText: updatedThinkingText 
  };
};

/**
 * Process done events
 * @param {Object} data - The event data object
 * @param {Object|null} toolExecution - The current tool execution object
 * @param {Function} setConversationId - Function to update conversation ID
 * @param {Function} setProcessCollapsed - Function to update process collapsed state
 * @param {Function} setToolExecution - Function to update current tool execution
 */
export const processDoneEvent = (
  data,
  toolExecution,
  setConversationId,
  setProcessCollapsed,
  setToolExecution
) => {
  // Store conversation ID for continuity
  if (data.conversation_id) {
    setConversationId(data.conversation_id);
  }
  
  // Don't immediately collapse or clear tool execution
  // Instead, keep it visible for a few seconds so users can see the final state
  if (toolExecution && (toolExecution.status === 'completed' || toolExecution.status === 'error')) {
    // Keep success/failure states visible for 3 seconds before clearing
    setTimeout(() => {
      setProcessCollapsed(true);
      setToolExecution(null);
    }, 3000);
  } else {
    // If there was no tool execution, collapse normally
    setProcessCollapsed(true);
    setToolExecution(null);
  }
};
