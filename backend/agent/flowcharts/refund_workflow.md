# Refund Verification Workflow

This flowchart illustrates the structured workflow for handling refund requests, including the verification process and decision points.

```mermaid
flowchart TD
    Start([User Requests Refund]) --> ValidateOrder[Validate Order Exists]
    
    ValidateOrder --> GetOrderDetails[get_order_details Tool]
    GetOrderDetails --> CheckOrder{Valid Order?}
    
    CheckOrder -->|No| InvalidOrder[Notify Invalid Order ID]
    CheckOrder -->|Yes| CreateWorkflow[create_refund_workflow Tool]
    
    %% Workflow initialization and data collection
    CreateWorkflow --> CollectReason[Collect Refund Reason]
    CollectReason --> GetVerifCriteria[get_refund_verification_criteria Tool]
    GetVerifCriteria --> RequestEvidence[Request Supporting Evidence]
    
    %% Image upload and verification branch
    RequestEvidence --> ImageUploaded{Image Provided?}
    ImageUploaded -->|No| CheckLateDelivery{Late Delivery?}
    CheckLateDelivery -->|Yes| SkipVerification[Skip Image Verification]
    CheckLateDelivery -->|No| RejectNoEvidence[Reject: No Evidence]
    
    ImageUploaded -->|Yes| VerifyImage[verify_refund_image Tool]
    VerifyImage --> UpdateWorkflow1[update_refund_workflow Tool]
    
    %% Verification scoring and decision
    UpdateWorkflow1 --> ScoreCheck{Verification Score?}
    ScoreCheck -->|Score ≥ 70| ApprovalPath[High Confidence Approval]
    ScoreCheck -->|40-70| ReviewPath[Manual Review Path]
    ScoreCheck -->|Score < 40| RejectionPath[Rejection Path]
    
    %% Approval path
    ApprovalPath --> CheckConsistency{Evidence Matches Claim?}
    CheckConsistency -->|No| ReviewPath
    CheckConsistency -->|Yes| Approve[Approve Refund]
    
    %% Rejection path with reasoning
    RejectionPath --> GenerateRejectionReason[Generate Rejection Reason]
    GenerateRejectionReason --> Reject[Reject Refund]
    
    %% Process decision and update workflow
    Approve --> ProcessDecision[process_refund_decision Tool]
    ReviewPath --> ProcessReview[process_refund_decision Tool: Manual Review]
    Reject --> ProcessReject[process_refund_decision Tool: Rejected]
    
    %% Final steps
    ProcessDecision --> InitiateRefund[initiate_refund Tool]
    ProcessReview --> NotifyReview[Notify Manual Review]
    ProcessReject --> NotifyRejection[Notify Rejection]
    
    %% Skip verification path for late delivery
    SkipVerification --> ProcessLateDelivery[Process Late Delivery Claim]
    ProcessLateDelivery --> DeliveryCheck{Confirm Late?}
    DeliveryCheck -->|Yes| ProcessDecision
    DeliveryCheck -->|No| ReviewPath
    
    %% Final response paths
    InitiateRefund --> FormatApproval[Format Approval Message]
    NotifyReview --> FormatReview[Format Review Message]
    NotifyRejection --> FormatRejection[Format Rejection Message]
    RejectNoEvidence --> FormatNoEvidence[Format No Evidence Message]
    InvalidOrder --> FormatInvalidOrder[Format Invalid Order Message]
    
    %% Response formatting
    FormatApproval --> CreateResponse[Create Structured Response]
    FormatReview --> CreateResponse
    FormatRejection --> CreateResponse
    FormatNoEvidence --> CreateResponse
    FormatInvalidOrder --> CreateResponse
    
    CreateResponse --> Respond[Respond to User]
    
    %% Styling
    classDef userInput fill:#e6f7ff,stroke:#0070d2,stroke-width:1px;
    classDef process fill:#d5e8d4,stroke:#82b366,stroke-width:1px;
    classDef decision fill:#ffe6cc,stroke:#ff8c00,stroke-width:1px;
    classDef tools fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px;
    classDef approved fill:#d5e8d4,stroke:#82b366,stroke-width:2px;
    classDef rejected fill:#f8cecc,stroke:#b85450,stroke-width:2px;
    classDef review fill:#fff2cc,stroke:#d6b656,stroke-width:2px;
    
    class Start userInput;
    class ValidateOrder,CollectReason,RequestEvidence,GenerateRejectionReason process;
    class CheckOrder,ImageUploaded,ScoreCheck,CheckConsistency,CheckLateDelivery,DeliveryCheck decision;
    class GetOrderDetails,CreateWorkflow,GetVerifCriteria,VerifyImage,UpdateWorkflow1,ProcessDecision,ProcessReview,ProcessReject,InitiateRefund tools;
    class Approve,FormatApproval approved;
    class Reject,RejectNoEvidence,FormatRejection,FormatNoEvidence rejected;
    class ReviewPath,NotifyReview,FormatReview review;
```

## Key Refund Workflow Components

### 1. Order Validation Phase
- Verifies order exists using `get_order_details` tool
- Creates a structured refund workflow with `create_refund_workflow`
- Collects specific refund reason from user
- Determines verification criteria based on refund reason

### 2. Evidence Collection Phase
- Requests specific supporting evidence based on reason type
- Handles special cases like late delivery (no image required)
- Rejects claims requiring evidence when none is provided

### 3. Verification Analysis Phase
- Processes uploaded images with the `verify_refund_image` tool
- Updates workflow state with `update_refund_workflow` tool
- Generates verification score based on multiple factors:
  - Image clarity
  - Evidence relevance to claim
  - Timestamp validation
  - Order details match

### 4. Decision Logic Phase
- Implements strict approval conditions:
  - Verification score ≥ 70
  - Evidence clearly matches claim
  - Evidence shows significant issue
- Routes to manual review for:
  - Verification score between 40-70
  - Ambiguous or partial evidence
  - Subjective claims (e.g., taste, temperature)
- Rejects when:
  - Verification score < 40
  - No evidence for required claims
  - Evidence contradicts claim
  - Suspicious patterns detected

### 5. Processing and Communication Phase
- Uses `process_refund_decision` to record decision and reasoning
- Processes approved refunds with `initiate_refund` tool
- Generates appropriate communication for each outcome:
  - Approval: Confirmation and next steps
  - Manual review: Timeline and expectations
  - Rejection: Clear explanation with specific reasons
  - Invalid order: Troubleshooting guidance

This structured workflow ensures consistent, evidence-based refund handling with transparency across the entire process. The agent maintains context throughout multiple turns of conversation, creating a streamlined experience for resolving customer issues.
