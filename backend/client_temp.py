#!/usr/bin/env python3
"""
Test client for the food delivery chatbot that maintains conversation context
"""
import json
import requests
import time
from urllib.parse import urljoin
import sseclient  # You might need to install this: pip install sseclient-py

# Configuration
BASE_URL = 'http://localhost:8000'
CHAT_ENDPOINT = '/api/agent/chat/stream'
DEFAULT_LOCATION = {"latitude": 12.9716, "longitude": 77.5946}

def colorize(text, color_code):
    """Apply color to terminal output"""
    return f"\033[{color_code}m{text}\033[0m"

def print_user(text):
    """Print user message in green"""
    print(colorize(f"User: {text}", "32"))
    
def print_assistant(text):
    """Print assistant message in blue"""
    print(colorize(f"Assistant: {text}", "34"))
    
def print_debug(text):
    """Print debug info in yellow"""
    print(colorize(f"[DEBUG] {text}", "33"))

def print_event(text):
    """Print event info in magenta"""
    print(colorize(f"[EVENT] {text}", "35"))

def send_message(message, conversation_id=None, location=None):
    """
    Send a message to the chatbot API and process the streaming response
    
    Args:
        message: The text message to send
        conversation_id: Optional ID to maintain conversation context
        location: Optional location coordinates
        
    Returns:
        tuple: (final response text, new conversation ID)
    """
    url = urljoin(BASE_URL, CHAT_ENDPOINT)
    
    # Prepare request payload
    payload = {
        "message": message,
        "location": location or DEFAULT_LOCATION
    }
    
    # Include conversation_id if available
    if conversation_id:
        payload["conversation_id"] = conversation_id
        print_debug(f"Continuing conversation: {conversation_id}")
        # Extra debug for payload structure
        print_debug(f"Payload with conversation_id: {json.dumps(payload)}")
    else:
        print_debug("Starting new conversation")
    
    # Send HTTP request with streaming enabled
    response = requests.post(
        url,
        json=payload, 
        stream=True,
        headers={"Accept": "text/event-stream"}
    )
    
    if not response.ok:
        print(f"Error: {response.status_code} - {response.text}")
        return None, None
    
    # Process Server-Sent Events
    client = sseclient.SSEClient(response)
    final_response = ""
    new_conversation_id = conversation_id
    
    # Process events in the stream
    for event in client.events():
        try:
            data = json.loads(event.data)
            event_type = data.get("type")
            
            if event_type == "thinking":
                print_event(f"Thinking: {data.get('data', '')}")
            elif event_type == "message":
                message_text = data.get("data", "")
                if isinstance(message_text, str):
                    print_event(f"Received message: {message_text[:30]}...")
                    final_response = message_text
                else:
                    print_event(f"Received non-string message: {type(message_text)}")
                    if message_text is None:
                        final_response = ""
                    else:
                        final_response = str(message_text)
            elif event_type == "structured_data":
                print_event(f"Received structured data: {data.get('data', {}).get('type', 'unknown')}")
            elif event_type == "tool_start":
                print_event(f"Tool execution started: {data.get('tool_name', 'unknown')}")
            elif event_type == "tool_end":
                print_event(f"Tool execution completed: {data.get('tool_name', 'unknown')}")
            elif event_type == "done":
                print_event("Stream completed")
                # Check if conversation_id is in the event
                if "conversation_id" in data:
                    new_conversation_id = data["conversation_id"]
                    print_debug(f"Received conversation ID: {new_conversation_id}")
                else:
                    print_debug("No conversation ID in the done event")
                    # Log the entire data for debugging
                    print_debug(f"Done event data: {json.dumps(data)}")
        except json.JSONDecodeError:
            print_debug(f"Failed to parse event data: {event.data}")
    
    return final_response, new_conversation_id

def main():
    """Run the test sequence"""
    print(colorize("\n===== Testing Chatbot Memory =====\n", "1;37"))
    
    # First question
    first_question = "What is a giraffe?"
    print_user(first_question)
    
    # Send first message and get response
    response1, conversation_id = send_message(first_question)
    if response1:
        print_assistant(response1)
    
    print("\n" + colorize("Waiting 2 seconds before next question...", "33") + "\n")
    time.sleep(2)
    
    # Second question (testing memory)
    second_question = "What did I just ask you about?"
    print_user(second_question)
    
    # Send follow-up message with the same conversation ID
    response2, _ = send_message(second_question, conversation_id)
    if response2:
        print_assistant(response2)
    
    # Evaluate success
    print("\n" + colorize("===== Test Results =====", "1;37"))
    
    # Check if response2 is a string before using lower()
    if isinstance(response2, str) and "giraffe" in response2.lower():
        print(colorize("✓ SUCCESS: The chatbot remembered the previous question about giraffes", "1;32"))
    else:
        print(colorize("✗ FAILED: The chatbot did not remember the previous question", "1;31"))
        print(colorize(f"Response type: {type(response2)}", "1;31"))
        print(colorize(f"Response content: {response2}", "1;31"))

if __name__ == "__main__":
    main()
