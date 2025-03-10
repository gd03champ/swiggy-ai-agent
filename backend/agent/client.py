"""
Bedrock client setup for LangChain integration with multimodal support
"""
import os
import boto3
import base64
import logging
import mimetypes
from urllib.parse import urlparse
from typing import Dict, List, Optional, Union, Any
import httpx

from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class BedrockClientSetup:
    """Handles the setup and configuration of Amazon Bedrock client with multimodal support"""
    
    @staticmethod
    def get_bedrock_client():
        """
        Initialize the Bedrock client using environment variables for authentication.
        
        Returns:
            A configured Bedrock client
        """
        # These would be set in production; for the hackathon, providing directly
        # aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
        # aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        # aws_session_token = os.environ.get("AWS_SESSION_TOKEN")
        # region_name = os.environ.get("AWS_REGION", "us-east-1")
        
        # For demo purposes, using default credentials or directly provided credentials
        bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name="us-west-2",
            # aws_access_key_id=aws_access_key_id,
            # aws_secret_access_key=aws_secret_access_key,
            # aws_session_token=aws_session_token
        )
        
        return bedrock_runtime

    @staticmethod
    def get_llm(
        #model_id="anthropic.claude-3-5-sonnet-20241022-v2:0", 
        model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0", 
        temperature=0.0
        ):
        """
        Initialize the LLM for use with LangChain.
        
        Args:
            model_id: Bedrock model identifier, defaults to Claude 3 Sonnet
            temperature: Sampling temperature, higher is more creative
            
        Returns:
            Configured LLM instance
        """
        bedrock_client = BedrockClientSetup.get_bedrock_client()
        
        llm = ChatBedrock(
            client=bedrock_client,
            model_id=model_id,
            model_kwargs={
                "temperature": temperature,
                "max_tokens": 4096,
                "top_p": 0.9,
                "anthropic_version": "bedrock-2023-05-31"  # Required for multimodal messages
            }
        )
        
        return llm
    
    @staticmethod
    def get_prompt_template():
        """
        Creates the prompt template for the chatbot.
        
        Returns:
            A ChatPromptTemplate instance for the ReAct agent
        """
        system_message = """You are a helpful food delivery assistant for a food delivery app. 
You can help users with finding restaurants and dishes, checking order status, and processing refunds.
Always be polite and helpful. If you don't know something, say so instead of making up information.

When searching for restaurants:
1. Understand qualifiers in user queries such as "top rated," "popular," "best," etc.
2. Use these qualifiers when calling the search_restaurants tool
3. If a search returns no results, try a more general search or suggest alternatives
4. Be transparent about search failures and show alternative suggestions to the user

When handling refund requests and verifying images:
1. You HAVE THE ABILITY to receive and analyze images that users upload for refund verification
2. When a user uploads an image of a food order (like damaged items, incorrect orders, etc.), 
   acknowledge that you can see the image and use it for refund verification
3. For damaged food items, look for visible issues like spills, crushed packaging, or food quality problems
4. For incorrect order verification, compare what the user says they ordered with what's visible in the image
5. Ask clarifying questions about the image if needed to better assist with the refund process

When handling errors:
1. If a tool returns an error or no results, explain this clearly to the user
2. Pass along any suggestions from the tool about alternative searches
3. Always maintain context between queries even after errors

Think step-by-step before providing a final answer. Use the available tools when necessary.
"""
        
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_message),
                ("placeholder", "{chat_history}"),
                ("human", "{input}"),
                ("placeholder", "{agent_scratchpad}"),
            ]
        )
        
        return prompt
    
    @staticmethod
    def format_image_for_claude(image_data: str) -> Dict[str, Any]:
        """
        Format an image for Claude's multimodal API
        
        Args:
            image_data: Base64 encoded image data or URL
            
        Returns:
            Formatted image object for Claude's multimodal API
        """
        try:
            # Check if it's already a data URI with proper format
            if image_data.startswith("data:image"):
                # Extract the base64 part from data URI
                # Format is typically: data:image/jpeg;base64,<actual_base64_data>
                _, base64_part = image_data.split(";base64,", 1)
                
                # Validate the base64 data
                try:
                    base64.b64decode(base64_part)
                except:
                    logger.error("Invalid base64 data in data URI")
                    return None
                
                # For Claude, we need to use the 'base64' format instead of data URI
                return {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": base64_part
                    }
                }
            
            # Check if it's a URL
            try:
                parsed = urlparse(image_data)
                if all([parsed.scheme, parsed.netloc]):
                    # It's a URL, fetch and convert to base64
                    try:
                        with httpx.Client(timeout=30.0) as client:
                            response = client.get(image_data)
                            if response.status_code != 200:
                                logger.error(f"Failed to fetch image from URL: {image_data}")
                                return None
                            
                            # Get content type from response or try to guess from URL
                            content_type = response.headers.get("content-type")
                            if not content_type or not content_type.startswith("image/"):
                                content_type = mimetypes.guess_type(image_data)[0] or "image/jpeg"
                            
                            # Convert to base64
                            image_bytes = response.content
                            image_b64 = base64.b64encode(image_bytes).decode("utf-8")
                            
                            # Return in Claude's expected format
                            return {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": content_type,
                                    "data": image_b64
                                }
                            }
                    except Exception as e:
                        logger.error(f"Error fetching image from URL: {e}")
                        return None
            except:
                # Not a URL
                pass
            
            # Try to handle raw base64 data
            try:
                # Clean the input if it has any whitespace or newlines
                cleaned_data = ''.join(image_data.split())
                
                # Try to decode to validate it's proper base64
                base64.b64decode(cleaned_data)
                
                # Return in Claude's expected format
                return {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": cleaned_data
                    }
                }
            except:
                logger.error("Invalid image data format - not valid base64")
                return None
        except Exception as e:
            logger.error(f"Error formatting image for Claude: {str(e)}")
            return None

    @staticmethod
    def create_multimodal_message(text: str, images: List[str] = None) -> List[Dict[str, Any]]:
        """
        Create a multimodal message for Claude with text and optional images
        
        Args:
            text: The text message
            images: List of image data (base64 encoded or URLs)
            
        Returns:
            Formatted multimodal message for Claude
        """
        if not images:
            return [{"type": "text", "text": text}]
        
        # Start with text part
        message_parts = [{"type": "text", "text": text}]
        
        # Add image parts if available
        for image_data in images:
            image_part = BedrockClientSetup.format_image_for_claude(image_data)
            if image_part:
                # Debug the image format
                logger.info(f"Adding image part with type: {image_part.get('type')}")
                message_parts.append(image_part)
        
        # Log the final message structure (without full image data)
        debug_message = []
        for part in message_parts:
            if part.get('type') == 'text':
                debug_message.append({'type': 'text', 'text': part.get('text')[:50] + '...' if len(part.get('text', '')) > 50 else part.get('text')})
            else:
                debug_message.append({'type': part.get('type')})
                
        logger.info(f"Created multimodal message with {len(message_parts)} parts: {debug_message}")
        
        return message_parts
