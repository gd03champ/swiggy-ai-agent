import React from 'react';
import { motion } from 'framer-motion';

/**
 * Component to display the refund workflow status
 * Visualizes the multi-step refund process and shows current state
 */
const RefundWorkflowStatus = ({ 
  workflowState,
  isLoading = false
}) => {
  if (!workflowState && !isLoading) {
    return null;
  }
  
  // Loading state
  if (isLoading) {
    return (
      <motion.div 
        className="mt-3 mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900">Initializing Refund Process</h3>
            <div className="mt-1 text-sm text-gray-500">
              <p>Preparing your refund workflow...</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Format the workflow state data
  const data = workflowState?.current_state || workflowState || {};
  const stage = data.stage || 'collection';
  const orderId = data.order_id || 'Unknown';
  const nextRequired = workflowState?.next_required || '';
  const hasImage = data.has_image || false;
  const reasonCategory = data.reason_category || '';
  const reasonText = data.reason || 'Not specified';
  const validationScore = data.validation_score || 0;
  const recommendation = data.recommendation || '';
  const isComplete = workflowState?.is_complete || stage === 'decision';
  
  // Get color scheme based on stage
  const getStageColors = () => {
    switch(stage) {
      case 'collection':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'validation':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'decision':
        if (recommendation === 'approve') {
          return 'bg-green-100 text-green-800 border-green-200';
        } else if (recommendation === 'reject') {
          return 'bg-red-100 text-red-800 border-red-200';
        } else {
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get icon based on stage
  const getStageIcon = () => {
    switch(stage) {
      case 'collection':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'decision':
        if (recommendation === 'approve') {
          return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (recommendation === 'reject') {
          return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          );
        } else {
          return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          );
        }
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  // Format stage name for display
  const getStageName = () => {
    switch(stage) {
      case 'collection':
        return 'Data Collection';
      case 'validation':
        return 'Verification';
      case 'decision':
        return recommendation === 'approve' ? 'Refund Approved' :
               recommendation === 'reject' ? 'Refund Rejected' :
               'Manual Review';
      default:
        return 'Processing';
    }
  };
  
  // Get description of what's happening in this stage
  const getStageDescription = () => {
    switch(stage) {
      case 'collection':
        if (nextRequired === 'reason') {
          return 'Please provide the reason for your refund request.';
        } else if (nextRequired === 'image' && !hasImage) {
          return 'Please upload an image of the issue for verification.';
        } else if (nextRequired === 'proceed_to_validation') {
          return 'Information collected, proceeding to validation.';
        } else {
          return 'Collecting necessary information for your refund request.';
        }
      case 'validation':
        return 'Verifying your evidence against order details.';
      case 'decision':
        if (recommendation === 'approve') {
          return `Your refund request has been approved and is being processed.`;
        } else if (recommendation === 'reject') {
          return `Your refund request could not be approved automatically.`;
        } else {
          return `Your request requires manual review by our team.`;
        }
      default:
        return 'Processing your refund request.';
    }
  };
  
  // Get the stage completion status
  const getStageCompletion = () => {
    if (isComplete) return 100;
    
    switch(stage) {
      case 'collection':
        if (data.order_id && data.reason) {
          return data.has_image || reasonCategory === 'late_delivery' ? 100 : 75;
        } else if (data.order_id) {
          return 50;
        } else {
          return 25;
        }
      case 'validation':
        return data.image_verification_result ? 100 : 50;
      case 'decision':
        return 100;
      default:
        return 50;
    }
  };
  
  // Determine what is needed next
  const getNextNeeded = () => {
    if (nextRequired === 'reason') {
      return (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-2 mt-3">
          <p className="text-xs text-blue-700">Please describe why you're requesting a refund</p>
        </div>
      );
    } else if (nextRequired === 'image' && !hasImage && reasonCategory !== 'late_delivery') {
      return (
        <div className="bg-blue-50 border border-blue-100 rounded-md p-2 mt-3">
          <p className="text-xs text-blue-700">Please upload an image showing the issue</p>
        </div>
      );
    } else if (nextRequired === 'verify_image') {
      return (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-2 mt-3">
          <p className="text-xs text-yellow-700">Verifying your uploaded image...</p>
        </div>
      );
    } else if (stage === 'decision' && recommendation === 'manual_review') {
      return (
        <div className="bg-yellow-50 border border-yellow-100 rounded-md p-2 mt-3">
          <p className="text-xs text-yellow-700">Your request has been forwarded for manual review (1-2 business days)</p>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <motion.div 
      className={`my-3 p-4 rounded-lg border shadow-sm ${getStageColors()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white bg-opacity-50">
            {getStageIcon()}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium">Refund Request: {getStageName()}</h3>
            <div className="text-xs">Order #{orderId}</div>
          </div>
          
          <div className="mt-1 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">{getStageDescription()}</div>
            {stage === 'decision' && validationScore > 0 && (
              <div className="text-sm font-medium mt-1 sm:mt-0">
                Score: {validationScore}/100
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 mt-2">
            <div 
              className="bg-current h-1.5 rounded-full" 
              style={{width: `${getStageCompletion()}%`}}
            ></div>
          </div>
          
          {/* Additional context specific to the stage */}
          {stage === 'collection' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
              <div>
                <span className="font-medium">Reason:</span> {reasonText || 'Not provided yet'}
              </div>
              {reasonCategory && reasonCategory !== 'late_delivery' && (
                <div>
                  <span className="font-medium">Evidence:</span> {hasImage ? 'Image uploaded' : 'No image yet'}
                </div>
              )}
            </div>
          )}
          
          {/* Next step needed */}
          {getNextNeeded()}
        </div>
      </div>
    </motion.div>
  );
};

export default RefundWorkflowStatus;
