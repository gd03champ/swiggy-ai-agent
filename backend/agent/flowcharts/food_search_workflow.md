# Food Search Chain-of-Thought Workflow

This flowchart illustrates the decision-making process and chain of tools used by the Swiggy AI Assistant when processing food and restaurant search requests.

```mermaid
flowchart TD
    Start([User Query]) --> Parse[Parse User Intent]
    
    Parse --> Decision{What is user looking for?}
    Decision -->|Specific Restaurant| R1[Restaurant Name Search]
    Decision -->|Restaurant Category| R2[Restaurant Category Search]
    Decision -->|Specific Food Item| F1[Food Item Search]
    Decision -->|Dietary/Health Needs| H1[Health-Aware Search]
    
    %% Restaurant by name workflow
    R1 --> SearchDirect[search_restaurants_direct]
    SearchDirect --> RestaurantFound{Restaurant found?}
    RestaurantFound -->|Yes| GetMenu1[get_restaurant_menu]
    RestaurantFound -->|No| Fallback[Fallback Search]
    Fallback --> SearchCategory[search_restaurants]
    
    %% Restaurant by category workflow
    R2 --> SearchCategory
    SearchCategory --> CategoryResults{Results sufficient?}
    CategoryResults -->|Yes| FormatRestResults[Format Restaurant Results]
    CategoryResults -->|No| Refine[Refine Search]
    Refine --> SearchCategory
    
    %% Food item workflow
    F1 --> SearchFood[search_food_items_enhanced]
    SearchFood --> FoodResults{Results found?}
    FoodResults -->|Yes| ProcessFood[Process Food Item Results]
    FoodResults -->|No| FoodFallback[Use Fallback Food Items]
    
    %% Extract restaurant IDs from food results workflow
    ProcessFood --> ExtractIDs[Extract Restaurant IDs]
    ExtractIDs --> FetchMenus[Fetch Menu Details]
    FetchMenus --> GetMenu2[get_restaurant_menu]
    GetMenu2 --> EnrichResults[Enrich Results with Menu Data]
    
    %% Health-aware search path
    H1 --> CheckMemory[Check User Preferences]
    CheckMemory --> FilterCriteria[Apply Health Filters]
    FilterCriteria --> SearchFood
    
    %% Medical document path (connected to food search)
    MedDoc[Medical Document Analysis] -.-> ExtractRestrictions[Extract Dietary Needs]
    ExtractRestrictions -.-> H1
    
    %% Final processing and response
    GetMenu1 --> FormatResponse[Format Structured Response]
    FormatRestResults --> FormatResponse
    EnrichResults --> FormatResponse
    FoodFallback --> FormatResponse
    
    FormatResponse --> StructuredData[Create Structured Data Cards]
    StructuredData --> Respond[Respond to User]
    
    %% Styling
    classDef userInput fill:#e6f7ff,stroke:#0070d2,stroke-width:1px;
    classDef decision fill:#ffe6cc,stroke:#ff8c00,stroke-width:1px;
    classDef process fill:#d5e8d4,stroke:#82b366,stroke-width:1px;
    classDef tools fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px;
    classDef results fill:#fff2cc,stroke:#d6b656,stroke-width:1px;
    
    class Start,Parse userInput;
    class Decision,RestaurantFound,CategoryResults,FoodResults decision;
    class R1,R2,F1,H1,ProcessFood,ExtractIDs,FetchMenus,EnrichResults,FilterCriteria,FormatResponse,FormatRestResults process;
    class SearchDirect,SearchCategory,SearchFood,GetMenu1,GetMenu2 tools;
    class StructuredData,Respond results;
```

## Key Chain-of-Thought Decision Points

### 1. Intent Classification
The agent first determines what the user is looking for:
- Specific restaurant by name (e.g., "Find Domino's Pizza")
- Restaurant category (e.g., "Show me popular restaurants")
- Specific food item (e.g., "I want vegetable soup")
- Health-based suggestions (e.g., "Healthy food options for diabetics")

### 2. Multi-Stage Tool Selection
Based on the intent classification, the agent selects an appropriate tool chain:

**Restaurant Search Chain:**
- `search_restaurants_direct` for specific restaurant names
- `search_restaurants` for browsing by category
- `get_restaurant_menu` to fetch detailed menu information

**Food Item Search Chain:**
- `search_food_items_enhanced` to find specific dishes across restaurants
- Extract restaurant IDs from food search results
- `get_restaurant_menu` to enrich results with complete menu context

**Health-Aware Chain:**
- Check memory for user preferences and restrictions
- Apply health filters to search criteria
- Connect with medical document analysis when applicable
- Use specialized food search with health parameters

### 3. Adaptive Response Strategy
The agent adapts its search strategy based on initial results:
- Use fallback searches when primary search returns no results
- Refine search parameters to improve relevance
- Switch between search types when appropriate
- Apply result enrichment for more comprehensive information

### 4. Response Formatting
After completing the search chain, results are organized into structured data:
- Restaurant cards with ratings, cuisines, and delivery times
- Food item cards with prices, descriptions, and images
- Special formatting for health-related information
