"""
LangChain agent for food delivery app chatbot with simplified global memory and image understanding
"""
import asyncio
import json
import time
from typing import Dict, Any, List, Optional, AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

from .client import BedrockClientSetup
from .memory import ConversationMemoryManager
from .tools.order_tools import get_order_details, initiate_refund 
from .tools.search_tools import search_restaurants, search_restaurants_direct, search_food_items, get_restaurant_menu
from .callbacks import StreamingToolsCallbackHandler, EnhancedStreamingHandler


# Helper functions for multi-tool orchestration
def extract_restaurant_ids_from_food_results(results: Dict[str, Any]) -> List[str]:
    """Extract unique restaurant IDs from food search results"""
    if not results or "results" not in results:
        return []
    
    restaurant_ids = set()
    for item in results.get("results", []):
        if isinstance(item, dict) and "data" in item:
            rest_id = item["data"].get("restaurant_id")
            if rest_id:
                restaurant_ids.add(rest_id)
    
    return list(restaurant_ids)

def format_results_for_next_step(results: Dict[str, Any], result_type: str) -> str:
    """Format results for use in a follow-up tool call"""
    if result_type == "food_items" and "results" in results:
        restaurants = {}
        # Group food items by restaurant
        for item in results.get("results", []):
            if "data" in item:
                rest_id = item["data"].get("restaurant_id")
                rest_name = item["data"].get("restaurant_name", "Unknown")
                if rest_id not in restaurants:
                    restaurants[rest_id] = {"name": rest_name, "items": []}
                restaurants[rest_id]["items"].append(item["data"].get("name"))
        
        # Format for LLM consumption
        result_str = "Found food items at these restaurants:\n"
        for rest_id, data in restaurants.items():
            items_str = ", ".join(data["items"])
            result_str += f"- {data['name']} (ID: {rest_id}): {items_str}\n"
        
        return result_str
    
    return str(results)


class ChatbotAgent:
    """LangChain agent implementation for food delivery chatbot"""
    
    def __init__(self):
        """Initialize the chatbot agent with LLM, tools, and memory"""
        # Initialize Bedrock client and LLM
        self.llm = BedrockClientSetup.get_llm()
        self.prompt = self._get_enhanced_prompt_template()
        
        # Define the tools
        self.tools = [
            get_order_details,
            initiate_refund,
            search_restaurants,
            search_restaurants_direct,
            search_food_items,
            get_restaurant_menu
        ]
        
        # Initialize the memory manager (needed for image processing)
        self.memory_manager = ConversationMemoryManager(window_size=10)
        
        # Create the tool calling agent (no memory - we use frontend history instead)
        self.agent = create_tool_calling_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Create a single agent executor (memory-free version)
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            memory=None,  # No memory - history comes from frontend now
            handle_parsing_errors=True,
            max_iterations=500,
            max_execution_time=60
        )
    
    def _get_enhanced_prompt_template(self) -> ChatPromptTemplate:
        """Create an enhanced prompt template that encourages multi-step reasoning"""
        from langchain_core.prompts import MessagesPlaceholder
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for a food delivery app.

For complex user requests, break down your thinking into multiple steps and use different tools sequentially.
Express your reasoning in short, clear sentences before using each tool.

THINKING FORMAT:
For each reasoning step, begin with: "Step X: I need to [your reasoning in 1-2 sentences]"
IMPORTANT: Keep your reasoning brief and concise - no more than 1-2 sentences per step.

STEP-BY-STEP REASONING PROCESS:
1. First, understand what the user is REALLY looking for
2. Identify which tools are needed to fulfill this request
3. Execute tools in a logical sequence, using the results from earlier tools
4. Think about what additional information you need after each step
5. Synthesize information from all tool results to provide a complete response

IMPORTANT TOOL SELECTION GUIDELINES:
- For restaurants or places to eat → use 'search_restaurants' tool
- For specific food items or dishes → use 'search_food_items' tool
- For restaurant menus → use 'get_restaurant_menu' tool (requires restaurant_id)
- For order details → use 'get_order_details' tool
- For refund requests → use 'initiate_refund' tool

CHAT HISTORY FORMAT:
- Each user message will include a <chat_history> tag with up to 6 recent messages
- The format will be:
  User: [previous user message]
  Assistant: [previous assistant response]
- Use this context to maintain conversation continuity
- Pay special attention to questions about previous messages or references
- When asked about previous messages, refer to this chat history context

CONVERSATION MEMORY GUIDELINES:
- You have access to the last 10 messages exchanged in this conversation
- Always reference this chat history when the user asks about previous messages
- When asked about past queries or conversations, DO NOT say "this is the beginning of our conversation"
- If the user asks what they asked earlier or wants a summary, refer to the actual previous messages
- For questions like "what was my first question?", look at the chat history and respond appropriately
- Examples of memory-related queries you should handle correctly:
  * "What did I ask you earlier?"
  * "Summarize our conversation"
  * "What was my first question?"
  * "What have we talked about so far?"
  * "Can you remember what I ordered?"

IMAGE ANALYSIS CAPABILITIES:
- You can see and analyze images that users upload
- For food delivery refund requests, examine images for:
  * Damaged food items (spills, crushed packaging)
  * Incorrect orders (items that don't match what was ordered)
  * Quality issues (undercooked, spoiled, or poor presentation)
- Be specific about what you see in the image when responding
- You can analyze receipts and restaurant menus in images
- Always reference what you observe in images when responding to user queries about them

REFUND REQUEST HANDLING:
You are equipped to handle refund requests with a structured conversation flow:

1. COLLECTION PHASE:
   - First, ask for and verify the order ID using get_order_details tool
   - Ask the user to provide the specific reason for requesting a refund
   - Ask the user to upload an image as supporting evidence for their claim

2. VALIDATION PHASE (Critical):
   - Carefully analyze any uploaded images to validate the refund reason
   - Compare what you see in the image with the stated reason for the refund
   - You must verify if the visual evidence supports the refund claim
   - Image of the food should strongly match the order details and the reason for the claim
   
3. DECISION CRITERIA:
   - APPROVE the refund when:
     * The image clearly shows food quality issues (spoilage, undercooked items, foreign objects)
     * The image shows received items that don't match the order details
     * The image shows damaged packaging affecting the food
     * The image shows incomplete delivery with missing items
   
   - REJECT the refund when:
     * No supporting image is provided (except for late delivery cases)
     * The image doesn't show the claimed issue
     * The image is too blurry, dark or unclear to validate the claim
     * The image shows an issue but contradicts the stated reason
     * The claim appears fraudulent or doesn't match evidence
   
4. USING initiate_refund TOOL:
   - Only call this tool AFTER validating the image evidence
   - When calling, include the order_id and a detailed reason including your image assessment
   - For rejected refunds, explain clearly why the evidence was insufficient

5. FOLLOW-UP:
   - After a refund is processed, explain next steps and when they can expect the money
   - For rejected refunds, suggest alternatives like contacting customer support

RESPONSE FORMAT:
- Use markdown for your responses (headings, lists, bold, etc.)
- Structure information clearly
- For restaurant/food listings, use numbered lists
- Highlight important information with **bold**

CRITICAL SPECIAL DATA FORMAT:
When presenting structured data like restaurants, food items, orders, or refunds, you MUST use the special format below:
- For restaurants: :::restaurant{{"name":"Restaurant Name", "rating":4.5, "cuisines":["Italian", "Pizza"], "delivery_time":"30 mins", "price_range":"$$$"}}:::
- For food items: :::food_item{{"name":"Food Name", "price":10.99, "description":"Description text", "restaurant_name":"Restaurant Name"}}:::
- For order details: :::order_details{{"order_id":"12345", "status":"delivered", "items":[{{"name":"Food Item", "quantity":2, "price":10.99}}], "total_price":21.98}}:::
- For refund status: :::refund_status{{"order_id":"12345", "status":"approved", "amount":21.98, "reason":"Food was cold", "timestamp":"2025-03-09T22:59:54.243015"}}:::

Example structured response:
"Here's the restaurant I found for you:

:::restaurant{{"name":"Pizza Palace", "rating":4.8, "cuisines":["Italian", "Pizza"], "delivery_time":"25 mins"}}:::

They have many great options on their menu. Here's one of their popular items:

:::food_item{{"name":"Margherita Pizza", "price":12.99, "description":"Classic pizza with tomato sauce, mozzarella, and basil"}}:::"

CRITICAL: Always use this exact format for displaying restaurants, food items, and orders.

Always respond conversationally and be helpful to the user.
Remember the context of previous messages in the conversation.
"""),
            ("human", "{human_input}"),
            ("ai", "I'll help you with that. Let me think through this step by step."),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        return prompt
    
    def _extract_structured_data(self, output: Any, tool_name: str = None) -> List[Dict[str, Any]]:
        """Extract structured data from tool outputs for rendering in UI"""
        structured_data = []
        
        if not isinstance(output, dict):
            return structured_data
            
        print(f"[DEBUG EXTRACT] Extracting structured data from tool output {tool_name}")
        
        # Case 1: Direct structured data
        if "type" in output and "data" in output:
            print(f"[DEBUG EXTRACT] Found direct structured data with type: {output['type']}")
            structured_data.append(output)
            
        # Case 2: Restaurant info from get_restaurant_menu
        elif "restaurant_info" in output:
            print(f"[DEBUG EXTRACT] Found restaurant_info in tool output")
            restaurant_card = {
                "type": "restaurant",
                "data": output["restaurant_info"]
            }
            structured_data.append(restaurant_card)
            
            # Also check for any food items
            if "featured_items" in output and isinstance(output["featured_items"], list):
                print(f"[DEBUG EXTRACT] Found {len(output['featured_items'])} featured items")
                for item in output["featured_items"][:5]:  # Limit to 5 items
                    rest_name = output.get("restaurant_name", "Restaurant")
                    rest_id = output.get("restaurant_id", "unknown")
                    
                    food_card = {
                        "type": "food_item",
                        "data": {
                            **item,
                            "restaurant_name": rest_name,
                            "restaurant_id": rest_id,
                        }
                    }
                    structured_data.append(food_card)
                    
        # Case 3: Results array with structured data
        elif "results" in output and isinstance(output["results"], list):
            print(f"[DEBUG EXTRACT] Found results array with {len(output['results'])} items")
            for item in output["results"][:10]:  # Limit to 10 items
                if isinstance(item, dict):
                    # Already has type/data format
                    if "type" in item and "data" in item:
                        structured_data.append(item)
                        print(f"[DEBUG EXTRACT] Added typed result: {item['type']}")
                    # Try to infer type from properties
                    elif "name" in item:
                        if "price" in item or "description" in item:
                            food_card = {"type": "food_item", "data": item}
                            structured_data.append(food_card)
                            print(f"[DEBUG EXTRACT] Added inferred food item: {item.get('name', 'Unknown')}")
                        elif "rating" in item or "cuisines" in item:
                            restaurant_card = {"type": "restaurant", "data": item}
                            structured_data.append(restaurant_card)
                            print(f"[DEBUG EXTRACT] Added inferred restaurant: {item.get('name', 'Unknown')}")
                            
        # Case 4: Menu array
        elif "menu" in output and isinstance(output["menu"], list):
            print(f"[DEBUG EXTRACT] Found menu array with {len(output['menu'])} categories")
            
            # First add restaurant info if available
            rest_name = output.get("restaurant_name", "Restaurant")
            rest_id = output.get("restaurant_id", "unknown")
            
            restaurant_card = {
                "type": "restaurant",
                "data": {
                    "name": rest_name,
                    "id": rest_id,
                    "cuisines": output.get("cuisines", []),
                    "rating": output.get("rating", "N/A")
                }
            }
            structured_data.append(restaurant_card)
            print(f"[DEBUG EXTRACT] Added basic restaurant card for {rest_name}")
            
            # Process a limited number of items from each category
            item_count = 0
            for category in output["menu"]:
                if "items" not in category or not isinstance(category["items"], list):
                    continue
                    
                category_name = category.get("category", "")
                print(f"[DEBUG EXTRACT] Processing category: {category_name}")
                
                # Process up to 3 items per category
                for idx, item in enumerate(category["items"]):
                    if idx >= 3:  # Limit items per category
                        break
                        
                    if item_count >= 10:  # Overall limit
                        break
                        
                    food_card = {
                        "type": "food_item",
                        "data": {
                            **item,
                            "restaurant_name": rest_name,
                            "restaurant_id": rest_id,
                            "category": category_name
                        }
                    }
                    structured_data.append(food_card)
                    item_count += 1
                    
                if item_count >= 10:  # Overall limit
                    break
                    
        # Case 5: Special case for order details
        elif (("order_id" in output and "items" in output) or 
              ("status" in output and "order_id" in output)):
            if "type" not in output:
                # Infer order_details type
                order_card = {"type": "order_details", "data": output}
                structured_data.append(order_card)
                print(f"[DEBUG EXTRACT] Added inferred order details")
                
        # Case 6: Check for refund status
        elif "refund_status" in output or ("refund" in output and "status" in output):
            if "type" not in output:
                # Infer refund_status type
                refund_card = {"type": "refund_status", "data": output}
                structured_data.append(refund_card)
                print(f"[DEBUG EXTRACT] Added inferred refund status")
                
        print(f"[DEBUG EXTRACT] Extracted {len(structured_data)} structured data items")
        return structured_data
        
    def _route_event(self, event: Dict[str, Any], main_queue: asyncio.Queue, 
                     structured_data_queue: asyncio.Queue) -> None:
        """Route events to the appropriate queue based on their type"""
        try:
            # Debug event details
            print(f"[DEBUG CRITICAL] _route_event received event of type: {event.get('type')}")
            
            # For tool_end events, check if they have structured data potential
            if event.get("type") == "tool_end" and "output" in event:
                output = event.get("output")
                tool_name = event.get("tool_name", "unknown_tool")
                
                # Extract any structured data from the tool output
                structured_items = self._extract_structured_data(output, tool_name)
                
                # Emit each structured data item as a separate event
                for item in structured_items:
                    structured_event = {
                        "type": "structured_data",
                        "data": item
                    }
                    print(f"[DEBUG CRITICAL] Emitting structured_data event for {item['type']}")
                    structured_data_queue.put_nowait(structured_event)
                    
                # Handle direct type/data format    
                if isinstance(output, dict) and "type" in output and "data" in output:
                    print(f"[DEBUG CRITICAL] tool_end event contains direct structured data: {output['type']}")
                    # Create and emit a structured_data event
                    structured_event = {
                        "type": "structured_data",
                        "data": output
                    }
                    print(f"[DEBUG CRITICAL] Creating structured_data event from tool_end: {json.dumps(structured_event)[:150]}")
                    structured_data_queue.put_nowait(structured_event)
                    print(f"[DEBUG CRITICAL] Emitted structured_data event to queue")
            
            # Special handling for structured_data events - send to dedicated queue
            if event.get("type") == "structured_data":
                print(f"[DEBUG CRITICAL] Routing structured_data event to special queue: {json.dumps(event)[:150]}...")
                print(f"[DEBUG CRITICAL] Before putting in structured_data_queue")
                structured_data_queue.put_nowait(event)
                print(f"[DEBUG CRITICAL] After putting in structured_data_queue")
            else:
                # All other events go to the main queue
                main_queue.put_nowait(event)
                
        except Exception as e:
            print(f"[ERROR CRITICAL] Error routing event: {e}")
            # Print full traceback for debugging
            import traceback
            traceback.print_exc()
            # Try to put it in the main queue as fallback
            try:
                main_queue.put_nowait(event)
            except Exception as inner_e:
                print(f"[ERROR CRITICAL] Could not route event to any queue: {event.get('type')}, error: {inner_e}")
    
    async def _get_streaming_response(
        self, 
        user_input: str,
        conversation_id: str,
        image_data: str = None,
        latitude: float = 12.9716,
        longitude: float = 77.5946
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process user input and stream response"""
        # Collect structured data from tool outputs
        structured_data = []
        
        # Create queues to handle streaming events
        event_queue = asyncio.Queue()
        structured_data_queue = asyncio.Queue()
        
        # Create streaming callback handler with routing function
        streaming_handler = EnhancedStreamingHandler(
            stream_func=lambda event: self._route_event(event, event_queue, structured_data_queue)
        )
        
        # Format chat history for better context awareness
        # If the message is asking about previous conversation, add a note to ensure
        # the model properly checks the chat history
        enhanced_input = user_input
        memory_related_keywords = [
            "what did i ask", "previous", "earlier", "first question", 
            "remember", "summarize", "conversation", "chat history"
        ]
        
        if any(keyword in user_input.lower() for keyword in memory_related_keywords):
            # This appears to be a message about the conversation history, make sure 
            # we emphasize the chat history for the model
            enhanced_input = f"[CONVERSATION HISTORY QUERY] {user_input}"
        
        # Format the input differently if we have an image
        # We'll use the client's multimodal message creation capability
        multimodal_message = None
        if image_data:
            print(f"[DEBUG IMAGE] Creating multimodal message with image data")
            # Create a multimodal message with image
            multimodal_message = BedrockClientSetup.create_multimodal_message(enhanced_input, [image_data])
            print(f"[DEBUG IMAGE] Created multimodal message: {multimodal_message[:1]}")
            
            # For debugging output, don't log the entire base64 image
            debug_message = multimodal_message.copy() if multimodal_message else None
            if debug_message and len(debug_message) > 1 and 'image_url' in debug_message[1]:
                debug_message[1]['image_url']['url'] = debug_message[1]['image_url']['url'][:50] + '...'
            print(f"[DEBUG IMAGE] Multimodal message structure: {debug_message}")
        
        # Use our agent executor directly (no memory)
        
        # Start agent execution in background task
        async def run_agent():
            try:
                # If we have an image, we need to bypass the agent executor and use the LLM directly
                # since LangChain's agent doesn't support multimodal inputs properly
                if multimodal_message:
                    print(f"[DEBUG IMAGE] Using direct LLM invoke with multimodal message")
                    
                    # Load chat history from conversation-specific memory
                    memory = self.memory_manager.get_memory(conversation_id)
                    memory_vars = memory.load_memory_variables({})
                    chat_messages = memory_vars.get("chat_history", [])
                    
                    # Initialize messages with system prompt
                    messages = []
                    
                    # Add system message - extract content properly from template
                    system_content = self.prompt.messages[0].prompt.template
                    messages.append(SystemMessage(content=system_content))
                    
                    # Add chat history from conversation memory
                    for msg in chat_messages:
                        messages.append(msg)
                    
                    # Add user message with image - this is a special case direct to LLM
                    # Use proper format for multimodal message with Claude
                    if multimodal_message:
                        # Claude requires special handling for multimodal input
                        # The content should be a list of content parts
                        human_message = HumanMessage(content=multimodal_message)
                        print(f"[DEBUG IMAGE] Created human message with multimodal content: {type(human_message.content)}")
                        messages.append(human_message)
                    
                    try:
                        # Execute the LLM directly with the messages
                        print(f"[DEBUG IMAGE] Sending {len(messages)} messages to LLM")
                        response = await self.llm.ainvoke(messages)
                        print(f"[DEBUG IMAGE] Got response from LLM: {response}")
                        
                        # Format the response like the agent executor would
                        return {"output": response.content}
                    except Exception as e:
                        print(f"[ERROR] Error invoking LLM directly: {e}")
                        import traceback
                        traceback.print_exc()
                        return {"output": f"I had trouble processing the image. Error: {str(e)}"}
                else:
                    # Standard text-only execution with exact key matching the example
                    # Use only human_input as requested - no latitude/longitude
                    agent_input = {
                        "human_input": enhanced_input
                    }
                    
                    # No need to manually add the user message anymore
                    # AgentExecutor handles this through the memory system
                    
                    # Execute the agent with the prepared input - using our memory-free executor
                    return await self.agent_executor.ainvoke(
                        agent_input,
                        config={
                            "callbacks": [streaming_handler]
                        }
                    )
            except Exception as e:
                print(f"[ERROR] Agent execution error: {str(e)}")
                import traceback
                traceback.print_exc()
                await event_queue.put({
                    "type": "error",
                    "data": f"Error processing request: {str(e)}"
                })
                return {"output": f"Error: {str(e)}"}
        
        # Start the agent in background
        agent_task = asyncio.create_task(run_agent())
        
        # Yield initial thinking event
        yield {"type": "thinking", "data": "Analyzing your request..."}
        
        # Stream events from queue while agent is running
        structured_data_items = []  # Track items we've already yielded
        
        while not agent_task.done() or not event_queue.empty() or not structured_data_queue.empty():
            try:
                # First check for any structured data events (prioritize these)
                try:
                    structured_event = await asyncio.wait_for(structured_data_queue.get(), timeout=0.01)
                    
                    # Add to tracking list to avoid duplicates
                    event_id = hash(json.dumps(structured_event, default=str))
                    structured_data_items.append(event_id)
                    
                    yield structured_event
                    continue  # Continue to the next iteration to check for more structured data
                except asyncio.TimeoutError:
                    # No structured data available, try regular events
                    pass
                
                # Get next regular event with timeout
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=0.1)
                    
                    # Yield the event to the client
                    yield event
                    
                    # Process structured data from tool outputs for backward compatibility
                    if event.get("type") == "tool_end" and "output" in event:
                        output = event.get("output")
                        if isinstance(output, dict):
                            # Extract structured data from the output
                            extracted_data = self._extract_structured_data(output)
                            if extracted_data:
                                structured_data.extend(extracted_data)
                except asyncio.TimeoutError:
                    # No event available yet, continue the loop
                    pass
                
            except Exception as e:
                # Other errors
                print(f"[ERROR] Error processing events: {str(e)}")
                import traceback
                traceback.print_exc()
                yield {"type": "error", "data": f"Streaming error: {str(e)}"}
                break
        
        # Get the agent's final output
        try:
            output = await agent_task
            
            # Extract the final response
            final_message = output.get("output", "I'm not sure how to respond to that.")
            
            # For image processing, store response in memory manager
            if image_data:
                self.memory_manager.add_ai_message(conversation_id, final_message)
            
            # Return the final message
            yield {"type": "message", "data": final_message}
            
            # Send structured data events
            for data_item in structured_data:
                if isinstance(data_item, dict) and "type" in data_item and "data" in data_item:
                    yield {"type": "structured_data", "data": data_item}
                
        except Exception as e:
            # Handle errors from awaiting the task
            print(f"[ERROR] Agent execution error: {str(e)}")
            import traceback
            traceback.print_exc()
            yield {"type": "error", "data": f"Error in agent execution: {str(e)}"}
        
        # Signal completion with conversation ID to ensure client receives it
        yield {"type": "done", "conversation_id": conversation_id}
    
    async def process_message(
        self, 
        message: str, 
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        location: Optional[Dict[str, float]] = None,
        media: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process a message and return a streaming response"""
        # Generate a conversation ID if not provided
        if not conversation_id:
            conversation_id = "default"
            
        print(f"[DEBUG MEMORY] Processing message for conversation: {conversation_id}")
        
        # Extract location if provided
        latitude = location.get("latitude", 12.9716) if location else 12.9716
        longitude = location.get("longitude", 77.5946) if location else 77.5946
        
        # Process image data if present
        image_data = None
        if media and media.get("type") == "image" and media.get("data"):
            # Extract the image data
            image_data = media.get("data")
            print(f"[DEBUG IMAGE] Received image with metadata: {media.get('metadata', {})}")
            
            # Add context to the message for better image understanding
            image_metadata = media.get("metadata", {})
            filename = image_metadata.get("name", "uploaded image")
            message = f"{message}\n\n[Note: I've attached an image of {filename} for you to analyze]"
        
        # Store message in memory for image processing path only
        # The regular text path uses history from frontend
        self.memory_manager.add_user_message(conversation_id, message)
        
        # Process the message with conversation-specific memory
        async for response_chunk in self._get_streaming_response(
            message,
            conversation_id,
            image_data,
            latitude,
            longitude
        ):
            yield response_chunk
