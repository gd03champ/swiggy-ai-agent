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
from .tools.order_tools import get_order_details, initiate_refund, get_refund_details
from .tools.search_tools import search_restaurants, search_restaurants_direct, search_food_items_enhanced, get_restaurant_menu
from .tools.image_verification_tools import verify_refund_image, get_refund_verification_criteria, create_refund_workflow, update_refund_workflow, get_refund_workflow_state, process_refund_decision
from .tools.document_analysis_tools import analyze_medical_document
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
            # Order and refund tools
            get_order_details,
            initiate_refund,
            get_refund_details,
            
            # Search tools
            search_restaurants,
            search_restaurants_direct,
            search_food_items_enhanced,
            get_restaurant_menu,
            
            # Image verification and refund workflow tools
            verify_refund_image,
            get_refund_verification_criteria,
            create_refund_workflow,
            update_refund_workflow,
            get_refund_workflow_state,
            process_refund_decision,
            
            # Document analysis tools
            analyze_medical_document
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
            max_execution_time=120
        )
    
    def _get_enhanced_prompt_template(self) -> ChatPromptTemplate:
        """Create an enhanced prompt template that encourages multi-step reasoning"""
        from langchain_core.prompts import MessagesPlaceholder
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful assistant for a food delivery app.

For complex user requests, break down your thinking into multiple steps and use different tools sequentially.
Express your reasoning in short, clear sentences before using each tool.

MEDICAL DOCUMENT AND FOOD INTEGRATION:
When analyzing a medical prescription image:
1. First analyze the image with analyze_medical_document tool
2. Extract the dietary recommendations from the analysis results
3. Use search_food_items_enhanced tool to find actual food items that match those recommendations
4. Use search_restaurants and get_restaurant_menu tools to explore restaurant options offering these healthy choices  
5. Present both the prescription analysis AND matching food options to the user
6. Highlight which food items specifically align with the dietary recommendations from the prescription

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
- For specific restaurants by name → use 'search_restaurants_direct' tool
- For specific food items or dishes → use 'search_food_items_enhanced' tool (this efficiently searches across restaurants)
- For restaurant menus → use 'get_restaurant_menu' tool (requires restaurant_id)
- For order details → use 'get_order_details' tool
- For refund requests → use 'initiate_refund' tool

PREVENTING SEARCH LOOPS:
- When searching for food items, use search_food_items_enhanced ONLY ONCE
- DO NOT attempt multiple searches for the same food item with different wordings
- The search_food_items_enhanced tool already performs comprehensive searches across restaurants and cuisines

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

REFUND REQUEST HANDLING - STRICT VALIDATION REQUIRED:
You are equipped to handle refund requests with a structured, multi-step workflow that maintains context throughout the conversation:

1. COLLECTION PHASE - Use create_refund_workflow tool:
   - Start by creating a refund workflow using create_refund_workflow with conversation_id and order_id
   - Verify the order ID exists using get_order_details tool
   - Ask the user to provide the specific reason for requesting a refund
   - Update the workflow state with update_refund_workflow tool as information is collected
   - For most refund types, request image evidence (except for late delivery claims)
   - CRITICAL: Store all context in the refund workflow state, not just in memory

2. VALIDATION PHASE - Use verify_refund_image and get_refund_workflow_state tools:
   - Call verify_refund_image with the uploaded image, order details, and reason
   - Cross-reference the image evidence against specific reason requirements from get_refund_verification_criteria
   - Analyze the verification results objectively with HIGH SKEPTICISM
   - BE DIFFICULT TO CONVINCE - the default stance should be rejection unless evidence is clear
   - Update the workflow state with the verification results
   
3. DECISION CRITERIA - DEFAULT TO MANUAL REVIEW OR REJECTION:
   - APPROVE the refund ONLY when ALL these conditions are met:
     * The image clearly and undeniably shows the exact issue claimed
     * The order details match what's visible in the image
     * The issue is significant and not minor
     * The verification score is above 70
     
   - Send to MANUAL REVIEW when:
     * Evidence is present but inconclusive
     * The issue is subjective (like temperature, taste)
     * The image partially supports the claim but not definitively
     * The verification score is between 40-70
   
   - REJECT the refund when ANY of these apply:
     * No supporting image is provided (except for late delivery cases)
     * The image contradicts the stated reason
     * The image is too blurry or unclear to make any determination
     * There are signs of potential misrepresentation
     * The verification score is below 40
     * The timing between order and complaint is suspicious

4. USING process_refund_decision FOLLOWED BY initiate_refund:
   - First call process_refund_decision with your assessment
   - Use the result from process_refund_decision with the initiate_refund tool
   - Include detailed validation_details explaining why evidence was insufficient for rejected claims
   - Look for inconsistencies in the user's story vs. evidence

5. FOLLOW-UP:
   - After a refund is processed, explain next steps based on the decision
   - For manual review, set expectations about timeline (1-2 business days)
   - For rejected refunds, be firm but polite in explaining the specific reasons for rejection
   - Warn users about fraudulent claims if there are inconsistencies
             
USER PREFERENCES
   - User is diagnosed with diabetes and needs to follow a strict diet. So if the user asks for food recommendations, suggest healthy options suitable for diabetics.
   - If user asks for unhealthy food options, remind them of their dietary restrictions and suggest alternatives.
   - Tell them a mock data of what they've ordered before if they've going for concecutive unhealthy food options.

RESPONSE FORMAT:
- Use markdown for your responses (headings, lists, bold, etc.)
- Structure information clearly
- For restaurant/food listings, use numbered lists
- Highlight important information with **bold**

CRITICAL SPECIAL DATA FORMAT:
When presenting structured data like restaurants, food items, orders, or refunds, you MUST use the special format below:
- For restaurants: :::restaurant{{"name":"Restaurant Name", "rating":4.5, "cuisines":["Italian", "Pizza"], "delivery_time":"30 mins", "price_range":"$$$", "image_url":"cloudinaryImageId-or-full-url"}}:::
- For food items: :::food_item{{"name":"Food Name", "price":10.99, "description":"Description text", "restaurant_name":"Restaurant Name", "image_url":"imageId-or-full-url"}}:::
- For order details: :::order_details{{"order_id":"12345", "status":"delivered", "items":[{{"name":"Food Item", "quantity":2, "price":10.99}}], "total_price":21.98}}:::
- For refund status: :::refund_status{{"order_id":"12345", "status":"approved", "amount":21.98, "reason":"Food was cold", "timestamp":"2025-03-09T22:59:54.243015"}}:::

Example structured response:
"Here's the restaurant I found for you:

:::restaurant{{"name":"Pizza Palace", "rating":4.8, "cuisines":["Italian", "Pizza"], "delivery_time":"25 mins", "image_url":"c8c462d2-96a4-4579-87cb-696459cf6624"}}:::

They have many great options on their menu. Here's one of their popular items:

:::food_item{{"name":"Margherita Pizza", "price":12.99, "description":"Classic pizza with tomato sauce, mozzarella, and basil", "restaurant_name":"Pizza Palace", "image_url":"e33e1c96-0f9c-4468-b38e-5986c8599cmb"}}:::"

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
                
        # Case 7: Check for image verification result
        elif "verification_score" in output or "verification_status" in output:
            print(f"[DEBUG EXTRACT] Found image verification result")
            image_verification = {
                "type": "image_verification_result",
                "data": output
            }
            structured_data.append(image_verification)
            print(f"[DEBUG EXTRACT] Added image verification result")
            
        # Case 8: Check for refund workflow state
        elif ((tool_name == "create_refund_workflow" or 
               tool_name == "update_refund_workflow" or
               tool_name == "get_refund_workflow_state") and
              (("status" in output and "workflow_id" in output) or
               "current_stage" in output)):
            print(f"[DEBUG EXTRACT] Found refund workflow state")
            workflow_state = {
                "type": "refund_workflow_state",
                "data": output
            }
            structured_data.append(workflow_state)
            print(f"[DEBUG EXTRACT] Added refund workflow state")
            
        # Case 9: Check for document analysis result
        elif tool_name == "analyze_medical_document" or "document_type" in output or (
              "type" in output and output["type"] == "document_analysis_result"):
            print(f"[DEBUG EXTRACT] Found document analysis result")
            # Ensure we're passing the data in the right format
            if "type" in output and output["type"] == "document_analysis_result" and "data" in output:
                document_data = output
            else:
                document_data = {
                    "type": "document_analysis_result",
                    "data": output
                }
            structured_data.append(document_data)
            print(f"[DEBUG EXTRACT] Added document analysis result")
                
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
        
        # Store image data for tools to access, but don't create multimodal message
        # The verify_refund_image tool will use this directly
        if image_data:
            print(f"[DEBUG IMAGE] Processing image data of length: {len(image_data) if image_data else 0}")
            # Add specific text to help agent recognize image upload
            if "refund" in enhanced_input.lower():
                enhanced_input += "\n\nI've uploaded an image to verify my refund request. Please analyze it carefully."
            else:
                enhanced_input += "\n\nI've uploaded an image for you to analyze."
        
        # Use our agent executor directly (no memory)
        
        # Global variable to store the current image data for tools to access
        # This is necessary because we can't directly pass the image in agent_input
        # without modifying LangChain's AgentExecutor
        self._current_image_data = image_data if image_data else None
        self._current_conversation_id = conversation_id
        
        # Start agent execution in background task
        async def run_agent():
            try:
                # Always use the agent executor regardless of whether we have an image
                # The verify_refund_image tool will access the image data when needed
                
                # Track if this is an image analysis request in agent input
                agent_input = {
                    "human_input": enhanced_input
                }
                
                if image_data:
                    # Add a flag in the input to indicate image presence
                    # This helps the agent know an image was uploaded
                    agent_input["has_image"] = True
                    print(f"[DEBUG IMAGE] Processing request with image through agent executor")
                
                # Execute the agent with the prepared input
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
