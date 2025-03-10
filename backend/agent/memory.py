"""
Memory management for the chatbot agent, including per-conversation memory.
"""

from langchain.memory import ConversationBufferMemory
from langchain_core.messages import AIMessage, HumanMessage

class ConversationMemoryManager:
    """
    Memory manager that maintains a separate memory instance for each conversation.
    This enables the chatbot to keep track of multiple concurrent conversations.
    """
    
    def __init__(self, window_size=10):
        """
        Initialize the memory manager
        
        Args:
            window_size: Number of conversation turns to remember (default: 10)
        """
        self.window_size = window_size
        self.memories = {}
        print(f"ConversationMemoryManager initialized with window size {window_size}")
    
    def get_memory(self, conversation_id):
        """
        Get the memory for a specific conversation, creating it if it doesn't exist
        
        Args:
            conversation_id: Unique identifier for the conversation
            
        Returns:
            ConversationBufferMemory instance for this conversation
        """
        if not conversation_id:
            # Generate a default ID for conversations without an ID
            conversation_id = "default"
            
        if conversation_id not in self.memories:
            print(f"Creating new memory for conversation {conversation_id}")
            self.memories[conversation_id] = ConversationBufferMemory(
                memory_key="chat_history",
                input_key="human_input",
                return_messages=True
            )
        else:
            # Debug existing memory
            memory = self.memories[conversation_id]
            history = memory.chat_memory.messages
            print(f"[DEBUG MEMORY] Found existing memory for {conversation_id} with {len(history)} messages:")
            for idx, msg in enumerate(history):
                msg_type = "USER" if isinstance(msg, HumanMessage) else "AI"
                content_preview = str(msg.content)[:50] + "..." if len(str(msg.content)) > 50 else str(msg.content)
                print(f"[DEBUG MEMORY] Message {idx}: {msg_type} - {content_preview}")
            
        return self.memories[conversation_id]
    
    def add_user_message(self, conversation_id, message):
        """
        Add a user message to a conversation memory
        
        Args:
            conversation_id: Conversation identifier
            message: User message text
        """
        memory = self.get_memory(conversation_id)
        memory.chat_memory.add_user_message(message)
        
    def add_ai_message(self, conversation_id, message):
        """
        Add an AI message to a conversation memory
        
        Args:
            conversation_id: Conversation identifier
            message: AI message text
        """
        memory = self.get_memory(conversation_id)
        memory.chat_memory.add_ai_message(message)
    
    def get_chat_history(self, conversation_id):
        """
        Get the chat history for a specific conversation
        
        Args:
            conversation_id: Conversation identifier
            
        Returns:
            List of chat messages representing the conversation history
        """
        memory = self.get_memory(conversation_id)
        chat_history = memory.load_memory_variables({}).get("chat_history", [])
        return chat_history
    
    def clear(self, conversation_id=None):
        """
        Clear memory for a specific conversation or all conversations
        
        Args:
            conversation_id: Specific conversation to clear, or None to clear all
        """
        if conversation_id:
            if conversation_id in self.memories:
                self.memories[conversation_id].clear()
                print(f"Cleared memory for conversation {conversation_id}")
        else:
            self.memories = {}
            print("Cleared all conversation memories")
