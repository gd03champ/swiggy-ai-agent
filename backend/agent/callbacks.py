"""
Custom callback handlers for LangChain agents
"""
from typing import Dict, Any, List, Optional, AsyncGenerator, Callable, Union
import json
from datetime import datetime

from langchain_core.callbacks.base import AsyncCallbackHandler
from langchain_core.messages import BaseMessage


class EnhancedStreamingHandler(AsyncCallbackHandler):
    """Enhanced streaming handler that shows step-by-step reasoning"""
    
    def __init__(self, stream_func: Callable[[Dict[str, Any]], None] = None):
        """
        Initialize with a streaming function to send events
        
        Args:
            stream_func: Function that will be called with events to stream
        """
        super().__init__()
        self.stream_func = stream_func
        self.step_count = 0
        self.current_step = ""
        self.reasoning_steps = []  # Track reasoning steps
    
    async def _safe_stream(self, event_data: Dict[str, Any]) -> None:
        """Safely call stream_func with proper error handling
        
        Args:
            event_data: The event data to stream
        """
        if self.stream_func is None:
            print(f"Warning: stream_func is None, cannot stream event: {event_data.get('type', 'unknown')}")
            return
        
        # DEBUG: Print event data
        event_type = event_data.get("type", "unknown")
        print(f"[DEBUG CRITICAL] _safe_stream handling event of type: {event_type}")
        
        # Special handling for tool_end events to extract structured data
        if event_type == "tool_end" and "output" in event_data:
            output = event_data.get("output")
            
            if isinstance(output, dict):
                # Case 1: Direct extraction - restaurant info in get_restaurant_menu response
                if "restaurant_info" in output or "menu" in output:
                    print(f"[DEBUG CRITICAL] Found restaurant/menu data in tool_end")
                    
                    # Make sure we extract structured data from this output
                    # This code path may be reached separately from the _extract_structured_data in agent.py
                    if "restaurant_info" in output:
                        # Create restaurant card
                        restaurant_event = {
                            "type": "structured_data",
                            "data": {"type": "restaurant", "data": output["restaurant_info"]}
                        }
                        
                        # Create separate streaming event
                        try:
                            print(f"[DEBUG CRITICAL] Directly emitting restaurant structured data")
                            await self._safe_stream_direct(restaurant_event)
                        except Exception as e:
                            print(f"[ERROR CRITICAL] Error emitting restaurant structured data: {e}")
                            
                    # Process menu items
                    if "menu" in output and isinstance(output["menu"], list):
                        rest_name = output.get("restaurant_name", "Restaurant")
                        rest_id = output.get("restaurant_id", "unknown")
                        
                        for category in output["menu"][:2]:  # Limit categories
                            if "items" not in category:
                                continue
                                
                            for item in category.get("items", [])[:3]:  # Limit items
                                # Create food item card
                                food_event = {
                                    "type": "structured_data",
                                    "data": {
                                        "type": "food_item",
                                        "data": {
                                            **item,
                                            "restaurant_name": rest_name,
                                            "restaurant_id": rest_id,
                                            "category": category.get("category", "")
                                        }
                                    }
                                }
                                
                                # Create separate streaming event
                                try:
                                    print(f"[DEBUG CRITICAL] Directly emitting food item structured data")
                                    await self._safe_stream_direct(food_event)
                                except Exception as e:
                                    print(f"[ERROR CRITICAL] Error emitting food item structured data: {e}")
            
        # Normal event streaming
        try:
            # Call the function but ensure we properly await it if it's a coroutine
            result = self.stream_func(event_data)
            if hasattr(result, '__await__'):  # Check if it's awaitable
                await result
        except Exception as e:
            print(f"Error in EnhancedStreamingHandler._safe_stream: {repr(e)}")
            # Don't re-raise, we want to continue execution
    
    async def _safe_stream_direct(self, event_data: Dict[str, Any]) -> None:
        """Directly streams an event bypassing regular routing
        
        This is used for structured data that needs special handling
        """
        if self.stream_func is None:
            return
            
        try:
            # Call the stream function directly
            result = self.stream_func(event_data)
            if hasattr(result, '__await__'):  # Check if it's awaitable
                await result
        except Exception as e:
            print(f"[ERROR CRITICAL] Error in direct stream: {repr(e)}")
    
    async def on_agent_action(self, action, **kwargs: Any) -> None:
        """Run on agent action with step counter"""
        # Increment step counter
        self.step_count += 1
        
        # Extract the thought process
        thought = ""
        if hasattr(action, "log") and action.log:
            thought = action.log.strip()
        elif isinstance(action, dict) and "log" in action:
            thought = action.get("log", "").strip()
        
        # Format and clean the thought for better readability
        formatted_thought = thought
        if formatted_thought and isinstance(formatted_thought, str):
            # Clean up common patterns in LLM reasoning
            formatted_thought = formatted_thought.replace(
                "I'll use", "Using"
            ).replace(
                "I need to use", "Using"
            ).replace(
                "I will use", "Using"
            )
            
            # Try to extract the actual reasoning from LLM verbosity
            thinking_markers = ["I'll", "I will", "I need to", "I should", "I'm going to", "Let me"]
            for marker in thinking_markers:
                if marker in formatted_thought:
                    parts = formatted_thought.split(marker, 1)
                    if len(parts) > 1:
                        formatted_thought = f"{marker}{parts[1]}"
                        break

        # Store this reasoning step for later retrieval
        self.reasoning_steps.append({
            "step": self.step_count,
            "thought": formatted_thought
        })
                        
        # Signal a new reasoning step - ensure it's treated as a unique step
        if thought:
            await self._safe_stream({
                "type": "reasoning_step",
                "data": {
                    "step": self.step_count,
                    "thought": formatted_thought,
                    "timestamp": datetime.now().isoformat()  # Add timestamp to ensure uniqueness
                }
            })
        
        # Handle different action object types
        if hasattr(action, "tool"):
            # New style ToolAgentAction
            tool = action.tool
            tool_input = action.tool_input
        elif isinstance(action, dict):
            # Old style dict action
            tool = action.get("tool", "unknown_tool")
            tool_input = action.get("tool_input", {})
        else:
            # Fallback
            tool = str(action)
            tool_input = {}
        
        await self._safe_stream({
            "type": "agent_action", 
            "tool_name": tool,
            "step": self.step_count,
            "data": f"Step {self.step_count}: Agent decided to use {tool}",
            "input": tool_input
        })


class StreamingToolsCallbackHandler(AsyncCallbackHandler):
    """Callback handler that streams agent's thinking process and tool usage"""
    
    def __init__(self, stream_func: Callable[[Dict[str, Any]], None] = None):
        """
        Initialize with a streaming function to send events
        
        Args:
            stream_func: Function that will be called with events to stream
        """
        super().__init__()
        self.stream_func = stream_func
        self.step_count = 0
        self.reasoning_steps = []
        
    async def _safe_stream(self, event_data: Dict[str, Any]) -> None:
        """Safely call stream_func with proper error handling
        
        Args:
            event_data: The event data to stream
        """
        if self.stream_func is None:
            print(f"Warning: stream_func is None, cannot stream event: {event_data.get('type', 'unknown')}")
            return
            
        try:
            # Call the function but ensure we properly await it if it's a coroutine
            result = self.stream_func(event_data)
            if hasattr(result, '__await__'):  # Check if it's awaitable
                await result
        except Exception as e:
            print(f"Error in StreamingToolsCallbackHandler._safe_stream: {repr(e)}")
            # Don't re-raise, we want to continue execution
    
    async def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        """Run when LLM starts running"""
        await self._safe_stream({
            "type": "thinking", 
            "data": "Analyzing your request..."
        })
    
    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        """Run on new LLM token. Only available when streaming is enabled."""
        pass
    
    async def on_llm_end(
        self, response, **kwargs: Any
    ) -> None:
        """Run when LLM ends running"""
        pass
    
    async def on_llm_error(
        self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any
    ) -> None:
        """Run when LLM errors"""
        await self._safe_stream({
            "type": "thinking_error", 
            "data": f"Error during thinking: {str(error)}"
        })
    
    async def on_chain_start(
        self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any
    ) -> None:
        """Run when chain starts running"""
        pass
    
    async def on_chain_end(
        self, outputs: Dict[str, Any], **kwargs: Any
    ) -> None:
        """Run when chain ends running"""
        pass
    
    async def on_chain_error(
        self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any
    ) -> None:
        """Run when chain errors"""
        await self._safe_stream({
            "type": "chain_error", 
            "data": f"Error in chain: {str(error)}"
        })
    
    # New method to capture thinking events
    async def on_text(self, text: str, **kwargs: Any) -> None:
        """Run on arbitrary text, including agent thinking"""
        # Capture agent thinking as its own events
        if kwargs.get("category") == "agent:thinking" and text.strip():
            # We'll treat this as a separate reasoning step
            self.step_count += 1
            
            await self._safe_stream({
                "type": "reasoning_step",
                "data": {
                    "step": self.step_count,
                    "thought": text.strip(),
                    "timestamp": datetime.now().isoformat(),
                    "is_thinking": True
                }
            })
            
            # Also store it for later
            self.reasoning_steps.append({
                "step": self.step_count, 
                "thought": text.strip(),
                "is_thinking": True
            })
            
        # Also stream as regular thinking
        await self._safe_stream({
            "type": "thinking", 
            "data": text
        })

    async def on_tool_start(
        self, serialized: Dict[str, Any], input_str: str, **kwargs: Any
    ) -> None:
        """Run when tool starts running"""
        # We'll treat each tool execution as a reasoning step too
        self.step_count += 1
        
        # More robust tool name extraction with better logging
        # Inspect the full serialized object to find the name
        print(f"Tool start serialized: {json.dumps(serialized)}")
        print(f"Tool start kwargs: {json.dumps(kwargs, default=str)}")
        
        # Extract tool name from multiple possible sources
        # Changed: prioritize serialized['name'] over kwargs['name'] since it's more reliable at start time
        tool_name = None
        
        # In LangChain tool format, serialized has the most reliable name at start time
        if serialized and isinstance(serialized, dict):
            if "name" in serialized:
                tool_name = serialized["name"]
                print(f"Found tool name in serialized['name']: {tool_name}")
            elif "metadata" in serialized and "name" in serialized["metadata"]:
                tool_name = serialized["metadata"]["name"]
                print(f"Found tool name in serialized metadata: {tool_name}")
            elif "tool" in serialized:
                if isinstance(serialized["tool"], dict) and "name" in serialized["tool"]:
                    tool_name = serialized["tool"]["name"]
                    print(f"Found tool name in serialized['tool'] dict: {tool_name}")
                elif isinstance(serialized["tool"], str):
                    tool_name = serialized["tool"]
                    print(f"Found tool name in serialized['tool'] string: {tool_name}")
        
        # Fall back to kwargs only if serialized didn't have it
        if tool_name is None and "name" in kwargs and kwargs["name"]:
            tool_name = kwargs["name"]
            print(f"Found tool name in kwargs: {tool_name}")
            
        # Store the input parameters to provide more descriptive messages for the frontend
        tool_input = None
        try:
            if isinstance(input_str, str) and (input_str.startswith('{') or input_str.startswith('[')):
                tool_input = json.loads(input_str)
            else:
                tool_input = input_str
        except:
            tool_input = input_str
        
        # If still None, use the class name or default
        if tool_name is None:
            tool_name = (serialized.get("class", "")).split(".")[-1] or "unknown_tool"
            print(f"Using fallback tool name: {tool_name}")
        
        print(f"Extracted tool name: {tool_name}")
        
        # Try to safely parse input as JSON if it's a string representation of JSON
        try:
            if isinstance(input_str, str) and (input_str.startswith('{') or input_str.startswith('[')):
                tool_input = json.loads(input_str)
            else:
                tool_input = input_str
        except:
            tool_input = input_str
            
        await self._safe_stream({
            "type": "tool_start", 
            "tool_name": tool_name,
            "data": f"Using {tool_name}",
            "input": tool_input
        })

    async def on_tool_end(
        self, output: str, **kwargs: Any
    ) -> None:
        """Run when tool ends running"""
        # Log details for debugging
        print(f"[DEBUG CRITICAL] Tool end kwargs: {json.dumps(kwargs, default=str)}")
        
        # Enhanced tool name extraction - following same logic as in on_tool_start
        tool_name = None
        
        # First check kwargs
        if "name" in kwargs:
            tool_name = kwargs["name"]
        
        # If missing, try other sources or fallbacks
        if not tool_name:
            # Check invocation_params if available
            invocation_params = kwargs.get("invocation_params", {})
            if isinstance(invocation_params, dict):
                tool_name = invocation_params.get("name")
        
        # Final fallback
        if not tool_name:
            tool_name = "unknown_tool"
            
        print(f"[DEBUG CRITICAL] Tool end extracted name: {tool_name}")
        
        # Try to parse output as JSON if it's a string representation of JSON
        try:
            if isinstance(output, str) and (output.startswith('{') or output.startswith('[')):
                parsed_output = json.loads(output)
            else:
                parsed_output = output
        except:
            parsed_output = output
        
        # Debug output to see what the tools are returning
        print(f"[DEBUG CRITICAL] Tool output type: {type(parsed_output)}")
        print(f"[DEBUG CRITICAL] Tool output sample: {json.dumps(parsed_output, default=str)[:300]}")
        
        # Check if output contains an error message and send it as tool_error
        is_error = False
        if isinstance(parsed_output, dict) and "message" in parsed_output:
            error_message = parsed_output.get("message", "")
            if error_message.startswith("No restaurants found") or "error" in error_message.lower():
                is_error = True
                await self._safe_stream({
                    "type": "tool_error", 
                    "tool_name": tool_name,
                    "data": f"Search failed: {error_message}",
                    "output": parsed_output
                })
        
        # CRITICAL: Direct handling of order_details and refund_status types
        # These are special structured data types that need explicit handling
        if isinstance(parsed_output, dict) and "type" in parsed_output:
            if parsed_output["type"] in ["order_details", "refund_status"] and "data" in parsed_output:
                print(f"[DEBUG CRITICAL] Found direct {parsed_output['type']} - creating structured data event")
                # Direct emission as structured data
                await self._safe_stream({
                    "type": "structured_data",
                    "data": parsed_output
                })
                print(f"[DEBUG CRITICAL] Emitted {parsed_output['type']} structured data")
                
                # We still want to send the tool_end event, so don't return early
        
        if not is_error:
            # Forward any structured data in the output as separate events
            if isinstance(parsed_output, dict):
                # Initialize collections for structured data
                restaurant_results = []
                food_item_results = []
                
                # Determine if this is a restaurant or food item search based on tool name
                is_restaurant_search = kwargs.get("name") in ["search_restaurants", "search_restaurants_direct"]
                is_food_search = kwargs.get("name") in ["search_food_items", "get_restaurant_menu"]
                
                print(f"[DEBUG] Tool type detection: restaurant_search={is_restaurant_search}, food_search={is_food_search}")
                
                # Case 1: Process results array if present
                if "results" in parsed_output and isinstance(parsed_output["results"], list):
                    print(f"[DEBUG CRITICAL] Found results array in tool output: {len(parsed_output.get('results', []))}")
                    
                    # Process results with type awareness
                    if "results" in parsed_output and isinstance(parsed_output["results"], list):
                        results = parsed_output["results"]
                        print(f"[DEBUG] Processing {len(results)} results from tool output")
                        
                        for result in results:
                            # Skip non-dict results
                            if not isinstance(result, dict):
                                continue
                                
                            print(f"[DEBUG] Processing result item: {json.dumps(result)[:150]}...")
                            
                            # Case 1: Already properly formatted with type/data
                            if result.get("type") and result.get("data"):
                                if result["type"] == "restaurant":
                                    restaurant_results.append(result)
                                    print(f"[DEBUG] Added well-formed restaurant: {result.get('data', {}).get('name', 'Unknown')}")
                                elif result["type"] == "food_item":
                                    food_item_results.append(result)
                                    print(f"[DEBUG] Added well-formed food item: {result.get('data', {}).get('name', 'Unknown')}")
                                    
                            # Case 2: Nested data structure
                            elif "data" in result and isinstance(result["data"], dict):
                                item_data = result["data"]
                                
                                # Check restaurant properties
                                if (is_restaurant_search or 
                                    ("name" in item_data and ("rating" in item_data or "cuisine" in item_data))):
                                    restaurant_card = {
                                        "type": "restaurant",
                                        "data": item_data
                                    }
                                    restaurant_results.append(restaurant_card)
                                    print(f"[DEBUG] Added restaurant from nested data: {item_data.get('name', 'Unknown')}")
                                
                                # Check food item properties
                                elif (is_food_search or 
                                      ("name" in item_data and ("price" in item_data or "description" in item_data))):
                                    food_card = {
                                        "type": "food_item",
                                        "data": item_data
                                    }
                                    food_item_results.append(food_card)
                                    print(f"[DEBUG] Added food item from nested data: {item_data.get('name', 'Unknown')}")
                            
                            # Case 3: Direct data (flat structure)
                            else:
                                # Restaurant detection
                                if (is_restaurant_search or 
                                    ("name" in result and ("rating" in result or "cuisine" in result))):
                                    restaurant_card = {
                                        "type": "restaurant",
                                        "data": result
                                    }
                                    restaurant_results.append(restaurant_card)
                                    print(f"[DEBUG] Added restaurant from direct data: {result.get('name', 'Unknown')}")
                                
                                # Food item detection
                                elif (is_food_search or 
                                      ("name" in result and ("price" in result or "description" in result or "cost" in result))):
                                    food_card = {
                                        "type": "food_item",
                                        "data": result
                                    }
                                    food_item_results.append(food_card)
                                    print(f"[DEBUG] Added food item from direct data: {result.get('name', 'Unknown')}")
                    
                    # First emit all restaurant results if any
                    print(f"[DEBUG] Emitting {len(restaurant_results)} restaurant cards")
                    for restaurant in restaurant_results:
                        # Double check proper structure before sending
                        if restaurant.get("type") == "restaurant" and restaurant.get("data"):
                            print(f"[DEBUG] Sending restaurant card: {json.dumps(restaurant)[:100]}...")
                            await self._safe_stream({
                                "type": "structured_data",
                                "data": restaurant
                            })
                    
                    # Then emit all food item results if any
                    print(f"[DEBUG] Emitting {len(food_item_results)} food item cards")
                    for food_item in food_item_results:
                        # Double check proper structure before sending
                        if food_item.get("type") == "food_item" and food_item.get("data"):
                            print(f"[DEBUG] Sending food item card: {json.dumps(food_item)[:100]}...")
                            await self._safe_stream({
                                "type": "structured_data",
                                "data": food_item
                            })
                
                # Case 2: Process menu structure from get_restaurant_menu tool
                elif "menu" in parsed_output and isinstance(parsed_output["menu"], list):
                    print(f"[DEBUG CRITICAL] Found menu array with {len(parsed_output['menu'])} categories")
                    print(f"[DEBUG CRITICAL] Full parsed_output keys: {list(parsed_output.keys())}")
                    restaurant_name = parsed_output.get("restaurant_name", "Restaurant")
                    restaurant_id = parsed_output.get("restaurant_id", "unknown")
                    
                    # Check for the presence of results
                    if "results" in parsed_output:
                        print(f"[DEBUG CRITICAL] Found 'results' field with {len(parsed_output['results'])} items")
                    else:
                        print(f"[DEBUG CRITICAL] No 'results' field found in get_restaurant_menu output")
                        
                    # DEBUG: Print the first few menu items
                    if parsed_output["menu"] and len(parsed_output["menu"]) > 0:
                        first_category = parsed_output["menu"][0]
                        print(f"[DEBUG] First menu category: {first_category.get('category', 'Unknown')}")
                        if "items" in first_category and len(first_category["items"]) > 0:
                            print(f"[DEBUG] Sample item: {json.dumps(first_category['items'][0])[:150]}...")
                    
                    # First emit restaurant info as a separate structured_data event
                    if parsed_output.get("restaurant_info"):
                        restaurant_card = {
                            "type": "restaurant",
                            "data": parsed_output["restaurant_info"]
                        }
                        restaurant_results.append(restaurant_card)
                        print(f"[DEBUG] Added restaurant info from menu response: {restaurant_name}")
                        
                        # IMPORTANT: Explicitly emit this card right away
                        await self._safe_stream({
                            "type": "structured_data",
                            "data": restaurant_card
                        })
                    
                    # Always emit some restaurant info even if restaurant_info is missing
                    if not parsed_output.get("restaurant_info"):
                        basic_restaurant = {
                            "type": "restaurant",
                            "data": {
                                "name": restaurant_name,
                                "id": restaurant_id,
                                "cuisine": ["Fast Food", "Burgers"],
                                "menu_available": True
                            }
                        }
                        restaurant_results.append(basic_restaurant)
                        print(f"[DEBUG] Created basic restaurant card: {restaurant_name}")
                        
                        # Emit basic restaurant card
                        await self._safe_stream({
                            "type": "structured_data",
                            "data": basic_restaurant
                        })
                    
                    # Extract featured/popular items
                    if parsed_output.get("featured_items") and isinstance(parsed_output["featured_items"], list):
                        print(f"[DEBUG] Processing {len(parsed_output['featured_items'])} featured items")
                        for item in parsed_output["featured_items"]:
                            food_card = {
                                "type": "food_item",
                                "data": {
                                    **item,
                                    "restaurant_name": restaurant_name,
                                    "restaurant_id": restaurant_id,
                                    "featured": True
                                }
                            }
                            food_item_results.append(food_card)
                            print(f"[DEBUG] Added featured item: {item.get('name', 'Unknown')}")
                            
                            # Emit this card right away
                            await self._safe_stream({
                                "type": "structured_data",
                                "data": food_card
                            })
                    
                    # Always process menu categories regardless of tool type
                    menu_item_count = 0
                    for category in parsed_output["menu"]:
                        category_name = category.get("category", "Menu Items")
                        print(f"[DEBUG] Processing category: {category_name}")
                        
                        if "items" in category and isinstance(category["items"], list):
                            # Limit to 3 items per category to avoid overwhelming the UI
                            for idx, item in enumerate(category["items"]):
                                if idx >= 3:  # Only process first 3 items per category
                                    break
                                    
                                # Add restaurant context to the food item
                                food_card = {
                                    "type": "food_item",
                                    "data": {
                                        **item,
                                        "restaurant_name": restaurant_name,
                                        "restaurant_id": restaurant_id,
                                        "category": category_name
                                    }
                                }
                                food_item_results.append(food_card)
                                menu_item_count += 1
                                
                                # Emit this card right away
                                await self._safe_stream({
                                    "type": "structured_data",
                                    "data": food_card
                                })
                                
                    print(f"[DEBUG] Processed {menu_item_count} total menu items")
                
                # Case 3: Direct object is a restaurant
                elif "name" in parsed_output and ("rating" in parsed_output or "cuisine" in parsed_output):
                    print(f"[DEBUG] Found direct restaurant data")
                    restaurant_card = {"type": "restaurant", "data": parsed_output}
                    restaurant_results.append(restaurant_card)
                
                # Case 4: Direct object is a food item
                elif "name" in parsed_output and ("price" in parsed_output or "description" in parsed_output):
                    print(f"[DEBUG] Found direct food item data")
                    food_item_card = {"type": "food_item", "data": parsed_output}
                    food_item_results.append(food_item_card)
                
                # Emit all structured data as separate events
                print(f"[DEBUG] Emitting structured data: {len(restaurant_results)} restaurants, {len(food_item_results)} food items")
                
                # First emit restaurant cards
                for restaurant in restaurant_results:
                    if restaurant.get("type") == "restaurant" and restaurant.get("data"):
                        print(f"[DEBUG] Sending restaurant card: {json.dumps(restaurant)[:100]}...")
                        await self._safe_stream({
                            "type": "structured_data",
                            "data": restaurant
                        })
                
                # Then emit food item cards
                for food_item in food_item_results:
                    if food_item.get("type") == "food_item" and food_item.get("data"):
                        print(f"[DEBUG] Sending food item card: {json.dumps(food_item)[:100]}...")
                        await self._safe_stream({
                            "type": "structured_data",
                            "data": food_item
                        })
            
            await self._safe_stream({
                "type": "tool_end", 
                "tool_name": tool_name,
                "data": f"Tool {tool_name} completed!",
                "output": parsed_output
            })
    
    async def on_tool_error(
        self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any
    ) -> None:
        """Run when tool errors"""
        tool_name = kwargs.get("name", "unknown_tool")
        error_msg = str(error)
        
        # Log detailed error information to help with debugging
        print(f"Tool Error in {tool_name}: {error_msg}")
        print(f"Tool Error type: {type(error).__name__}")
        if hasattr(error, "__traceback__"):
            import traceback
            traceback.print_tb(error.__traceback__)
        
        await self._safe_stream({
            "type": "tool_error", 
            "tool_name": tool_name,
            "data": f"Error executing {tool_name}: {error_msg}"
        })
    
    async def on_text(self, text: str, **kwargs: Any) -> None:
        """Run on arbitrary text"""
        # Catch agent's thinking process
        if kwargs.get("category") == "agent:thinking":
            await self._safe_stream({
                "type": "thinking", 
                "data": text
            })
        else:
            await self._safe_stream({
                "type": "text", 
                "data": text
            })
    
    async def on_agent_action(
        self, action, **kwargs: Any
    ) -> None:
        """Run on agent action"""
        # Handle different action object types
        if hasattr(action, "tool"):
            # New style ToolAgentAction
            tool = action.tool
            tool_input = action.tool_input
        elif isinstance(action, dict):
            # Old style dict action
            tool = action.get("tool", "unknown_tool")
            tool_input = action.get("tool_input", {})
        else:
            # Fallback
            tool = str(action)
            tool_input = {}
        
        await self._safe_stream({
            "type": "agent_action", 
            "tool_name": tool,
            "data": f"Agent decided to use {tool}",
            "input": tool_input
        })
    
    async def on_agent_finish(
        self, finish: Dict[str, Any], **kwargs: Any
    ) -> None:
        """Run on agent end"""
        await self._safe_stream({
            "type": "agent_finish", 
            "data": "Agent has completed its reasoning"
        })
