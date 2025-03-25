# Medical Prescription Analysis Workflow

This flowchart illustrates the specialized workflow for processing medical prescriptions and generating food recommendations based on medical conditions.

```mermaid
flowchart TD
    Start([User Uploads Prescription]) --> ImageDetection[Detect Medical Document]
    
    ImageDetection --> DocAnalysis[analyze_medical_document Tool]
    DocAnalysis --> Extract[Extract Structured Medical Data]
    
    Extract --> ParseMedical{Parse Medical Data}
    
    ParseMedical --> ExtractDiagnosis[Extract Diagnosis]
    ParseMedical --> ExtractMedications[Extract Medications]
    ParseMedical --> ExtractDietary[Extract Dietary Recommendations]
    
    ExtractDiagnosis --> MedicalCondition[Identify Medical Condition]
    ExtractMedications --> MedicationRestrictions[Identify Medication Interactions]
    ExtractDietary --> DietaryNeeds[Extract Specific Dietary Needs]
    
    MedicalCondition --> GenerateProfile[Generate Health Profile]
    MedicationRestrictions --> GenerateProfile
    DietaryNeeds --> GenerateProfile
    
    GenerateProfile --> MemoryStore[Store in User Preferences]
    GenerateProfile --> FoodSearch[Food Recommendation Engine]
    
    %% Food Search Process based on Medical Profile
    FoodSearch --> KeywordExtraction[Extract Food Keywords]
    KeywordExtraction --> SearchFood[search_food_items_enhanced Tool]
    
    SearchFood --> FilterResults[Filter Results by Health Criteria]
    FilterResults --> RankResults[Rank by Health Compatibility]
    
    RankResults --> RestaurantIDs[Extract Restaurant IDs]
    RestaurantIDs --> MenuFetch[get_restaurant_menu Tool]
    
    MenuFetch --> HealthyOptions[Identify Healthy Menu Options]
    HealthyOptions --> AlternativeRecs[Generate Alternative Recommendations]
    
    HealthyOptions --> FormatResults[Format Results with Health Context]
    AlternativeRecs --> FormatResults
    
    FormatResults --> StructuredResponse[Create Structured Response]
    
    %% Medical explanations
    MedicalCondition -.-> GenerateExplanation[Generate Medical Context]
    DietaryNeeds -.-> GenerateExplanation
    GenerateExplanation -.-> FormatResults
    
    %% Final response
    StructuredResponse --> Respond[Respond to User]
    
    %% Presentation elements
    ParseMedical --> PresentPrescription[Format Prescription Analysis]
    PresentPrescription --> StructuredResponse
    
    %% Memory loop for future interactions
    MemoryStore --> FutureRef[Available for Future Queries]
    FutureRef -.-> Start
    
    %% Styling
    classDef userInput fill:#e6f7ff,stroke:#0070d2,stroke-width:1px;
    classDef processing fill:#d5e8d4,stroke:#82b366,stroke-width:1px;
    classDef tools fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px;
    classDef medicalData fill:#f8cecc,stroke:#b85450,stroke-width:1px;
    classDef results fill:#fff2cc,stroke:#d6b656,stroke-width:1px;
    classDef memory fill:#e1d5e7,stroke:#9673a6,stroke-width:1px;
    
    class Start userInput;
    class ImageDetection,Extract,ParseMedical,KeywordExtraction,FilterResults,RankResults,RestaurantIDs,FormatResults processing;
    class DocAnalysis,SearchFood,MenuFetch tools;
    class ExtractDiagnosis,ExtractMedications,ExtractDietary,MedicalCondition,MedicationRestrictions,DietaryNeeds,GenerateExplanation medicalData;
    class HealthyOptions,AlternativeRecs,PresentPrescription,StructuredResponse,Respond results;
    class GenerateProfile,MemoryStore,FutureRef memory;
```

## Key Workflow Components

### 1. Document Analysis Phase
- Detects and analyzes uploaded medical prescription images
- Uses the `analyze_medical_document` tool to extract structured data
- Parses diagnosis, medications, and dietary recommendations
- Identifies specific health conditions and restrictions

### 2. Health Profile Generation
- Compiles extracted medical data into a cohesive health profile
- Identifies food interactions with medications
- Determines dietary needs based on diagnosed conditions
- Stores information in memory for future interactions

### 3. Food Recommendation Phase
- Extracts food-related keywords based on health requirements
- Uses `search_food_items_enhanced` to find appropriate food options
- Applies health criteria filtering to search results
- Ranks results by compatibility with medical needs

### 4. Restaurant Menu Analysis
- Extracts restaurant IDs from food search results
- Uses `get_restaurant_menu` to obtain detailed menu information
- Identifies menu items matching health requirements
- Generates alternative recommendations when necessary

### 5. Contextual Response Formation
- Creates structured data cards with medical context
- Provides explanations linking medical conditions to food choices
- Formats results with health-specific information highlighting
- Delivers personalized response with both medical analysis and food recommendations

### 6. Memory Integration
- Stores user health profile for future interactions
- Enables consistent health-aware recommendations across sessions
- Allows for follow-up questions about dietary restrictions

This specialized workflow enables the agent to process medical documents and translate them into actionable food recommendations, creating a seamless experience between healthcare information and food ordering.
