# User Preference Memory Workflow

This flowchart illustrates how the Swiggy AI Assistant remembers and applies user preferences across conversations, creating a personalized experience for dietary restrictions.

```mermaid
flowchart TD
    %% Entry points
    Start1([New User Query]) --> CheckMemory[Check for Existing Preferences]
    Start2([Medical Analysis]) --> ExtractPrefs[Extract Health Preferences]
    Start3([Previous Orders]) --> AnalyzePatterns[Analyze Order Patterns]
    Start4([Explicit Statement]) --> ParsePreference[Parse Preference Statement]
    
    %% Memory check and creation workflow
    CheckMemory --> MemoryExists{User Profile Exists?}
    MemoryExists -->|Yes| LoadPreferences[Load User Preferences]
    MemoryExists -->|No| CreateNewProfile[Create New User Profile]
    
    %% Sources of preference data
    ExtractPrefs --> StoreMedicalPrefs[Store Medical Restrictions]
    AnalyzePatterns --> StoreImplicitPrefs[Store Implicit Preferences]
    ParsePreference --> StoreExplicitPrefs[Store Explicit Preferences]
    
    %% Storage paths
    StoreMedicalPrefs --> UpdateMemory[Update Memory]
    StoreImplicitPrefs --> UpdateMemory
    StoreExplicitPrefs --> UpdateMemory
    CreateNewProfile --> UpdateMemory
    
    %% Preference application
    LoadPreferences --> ApplyToSearch[Apply to Food Search]
    UpdateMemory --> ApplyToSearch
    
    %% Specific preference types
    ApplyToSearch --> KeywordFilters[Add Keyword Filters]
    ApplyToSearch --> ExclusionFilters[Add Exclusion Filters]
    ApplyToSearch --> RankingCriteria[Modify Ranking Criteria]
    
    %% Food search workflow with preferences applied
    KeywordFilters --> FoodSearch[search_food_items_enhanced]
    ExclusionFilters --> FoodSearch
    RankingCriteria --> FoodSearch
    
    %% Result filtering and personalization
    FoodSearch --> FilterResults[Filter Results by Preferences]
    FilterResults --> PersonalizeExplanations[Personalize Explanations]
    PersonalizeExplanations --> PresentResults[Present Personalized Results]
    
    %% Future query path with memory
    PresentResults --> FutureQuery[Future User Queries]
    FutureQuery -.-> CheckMemory
    
    %% Preference conflict resolution
    StoreMedicalPrefs --> ResolveConflicts{Preference Conflicts?}
    StoreExplicitPrefs --> ResolveConflicts
    ResolveConflicts -->|Yes| PriorityRules[Apply Priority Rules]
    ResolveConflicts -->|No| NormalPath[Normal Storage]
    PriorityRules --> UpdateMemory
    NormalPath --> UpdateMemory
    
    %% Example preference types
    subgraph "Examples of Remembered Preferences"
        Diabetic[Diabetic: Low Sugar Items]
        Veg[Vegetarian Only]
        Allergies[Food Allergies]
        Spice[Spice Tolerance]
        Cuisine[Cuisine Preferences]
    end
    
    %% Styling
    classDef userInput fill:#e6f7ff,stroke:#0070d2,stroke-width:1px;
    classDef memory fill:#e1d5e7,stroke:#9673a6,stroke-width:1px;
    classDef process fill:#d5e8d4,stroke:#82b366,stroke-width:1px;
    classDef decision fill:#ffe6cc,stroke:#ff8c00,stroke-width:1px;
    classDef tools fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px;
    classDef results fill:#fff2cc,stroke:#d6b656,stroke-width:1px;
    classDef preferences fill:#f8cecc,stroke:#b85450,stroke-width:1px;
    
    class Start1,Start2,Start3,Start4,FutureQuery userInput;
    class CheckMemory,LoadPreferences,CreateNewProfile,UpdateMemory memory;
    class ExtractPrefs,AnalyzePatterns,ParsePreference,FilterResults,PersonalizeExplanations process;
    class MemoryExists,ResolveConflicts decision;
    class FoodSearch tools;
    class PresentResults results;
    class Diabetic,Veg,Allergies,Spice,Cuisine,KeywordFilters,ExclusionFilters,RankingCriteria preferences;
```

## Key Memory System Components

### 1. Multiple Data Collection Paths
- **Explicit statements**: Direct user statements like "I'm vegetarian" or "I can't eat gluten"
- **Medical analysis**: Dietary needs extracted from uploaded prescriptions or health documents
- **Order history analysis**: Implicit preferences derived from ordering patterns
- **Real-time conversation**: Preferences mentioned during current conversation

### 2. Preference Storage Hierarchy
- **Medical restrictions** (highest priority): Health-critical restrictions from verified documents
- **Explicit preferences** (high priority): Clearly stated user preferences
- **Implicit preferences** (medium priority): Derived from behavior patterns
- **Temporary preferences** (low priority): One-time preferences for current session only

### 3. Conflict Resolution System
- Resolves contradictory preferences by applying priority rules
- Medical restrictions override other preferences for safety
- Recent preferences take precedence over older ones
- Explicit statements override implicit patterns

### 4. Memory Integration Points
- **Search modification**: Adds filters and modifies search parameters
- **Result filtering**: Post-processes search results to enforce preferences
- **Result ranking**: Re-ranks results to prioritize preference-matching items
- **Personalized explanations**: Adds context about why items were recommended

### 5. Types of Remembered Preferences
- **Dietary restrictions**: Vegetarian, vegan, gluten-free, etc.
- **Health conditions**: Diabetes, hypertension, allergies, etc.
- **Taste preferences**: Spice level, sweetness, cuisines, ingredients
- **Ordering habits**: Favorite restaurants, regular orders, usual order times

This memory system creates a persistent, personalized experience across sessions, making the agent more helpful over time as it learns user preferences and medical needs.
