# Swiggy AI Agent Architecture

This diagram illustrates the dynamic, non-linear architecture of the Swiggy AI Assistant. The diagram shows how different components interact with each other, enabling complex workflows that involve multiple tools working together.

```mermaid
graph TD
    %% Core components
    User((User)) <--> Input[Input/Output Interface]
    Input <--> Agent{Agent Core}
    
    %% Central reasoning components
    Agent <--> Reasoning[Reasoning Engine]
    Agent <--> Memory[Memory System]
    
    %% Tool orchestration
    Agent <--> ToolOrchestrator[Tool Orchestrator]
    ToolOrchestrator <--> ToolRegistry[Tool Registry]
    
    %% Tool categories with bidirectional connections
    ToolOrchestrator <--> Search[Search Tools]
    ToolOrchestrator <--> Doc[Document Analysis]
    ToolOrchestrator <--> Order[Order Management]
    ToolOrchestrator <--> Refund[Refund Processing]
    
    %% Individual tools
    Search --- S1[search_restaurants]
    Search --- S2[search_food_items_enhanced]
    Search --- S3[get_restaurant_menu]
    
    Doc --- D1[analyze_medical_document]
    
    Order --- O1[get_order_details]
    
    Refund --- R1[verify_refund_image]
    Refund --- R2[process_refund_decision]
    Refund --- R3[initiate_refund]
    
    %% Memory components with interconnections
    Memory --- M1[Conversation History]
    Memory --- M2[User Preferences]
    Memory --- M3[Session State]
    
    %% Processing components
    Reasoning --- P1[Intent Classification]
    Reasoning --- P2[Multi-step Planning]
    Reasoning --- P3[Context Integration]
    
    %% Response formatting
    Agent <--> Formatter[Response Formatter]
    Formatter --- F1[Structured Data]
    Formatter --- F2[UI Component Mapping]
    
    %% Feedback loops
    ToolOrchestrator --> Agent
    Reasoning --> ToolOrchestrator
    
    %% Style
    classDef core fill:#f96,stroke:#333,stroke-width:2px;
    classDef system fill:#bbf,stroke:#33c,stroke-width:1px;
    classDef tools fill:#bfb,stroke:#363,stroke-width:1px;
    classDef memory fill:#fcf,stroke:#c3c,stroke-width:1px;
    
    class Agent,Input core;
    class Reasoning,ToolOrchestrator,ToolRegistry,Formatter system;
    class Search,Doc,Order,Refund,S1,S2,S3,D1,O1,R1,R2,R3 tools;
    class Memory,M1,M2,M3 memory;
```

## Key Architectural Elements

- **Hub-and-Spoke Design**: The Agent Core acts as a central hub with bidirectional connections to all major subsystems
- **Dynamic Tool Selection**: Tool Orchestrator selects from the Tool Registry based on reasoning outcomes and context
- **Concurrent Processing**: Multiple components can be active simultaneously when appropriate
- **Feedback Loops**: Results from tools feed back into the reasoning engine to trigger additional tool calls
- **Memory Integration**: The memory system influences all aspects of processing

This architecture allows complex workflows like:
- Medical document analysis triggering food searches while checking user preferences
- Order and refund tools working together while accessing order history
- Iterative search refinement based on partial findings
