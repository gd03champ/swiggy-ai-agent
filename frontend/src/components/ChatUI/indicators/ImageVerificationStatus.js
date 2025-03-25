import React from 'react';
import { motion } from 'framer-motion';

/**
 * Component to display the image verification status for refund requests
 * Shows verification progress, results, and recommendations
 */
const ImageVerificationStatus = ({ 
  verificationResult,
  isLoading = false
}) => {
  if (!verificationResult && !isLoading) {
    return null;
  }
  
  // Helper function to get status class
  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'unverified':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'inconclusive':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };
  
  // Helper function to get recommendation display
  const getRecommendationDisplay = (recommendation) => {
    switch(recommendation?.toLowerCase()) {
      case 'approve':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve Refund
          </span>
        );
      case 'reject':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-red-100 text-red-800">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject Refund
          </span>
        );
      case 'manual_review':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Manual Review
          </span>
        );
    }
  };
  
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900">Analyzing Refund Image</h3>
            <div className="mt-1 text-sm text-gray-500">
              <p>Verifying your uploaded image...</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Format the verification result for display
  const data = verificationResult?.data || verificationResult || {};
  const status = data.verification_status || 'inconclusive';
  const score = data.verification_score || 0;
  const notes = data.verification_notes || '';
  const recommendation = data.recommendation || 'manual_review';
  const detectedIssues = data.detected_issues || [];
  const flaggedIssues = data.flagged_issues || [];
  const matchesOrder = data.matches_order_items || false;
  
  return (
    <motion.div 
      className="my-3 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="flex-shrink-0 mr-4 mb-4 sm:mb-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusClass(status)}`}>
            {status === 'verified' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'unverified' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Image Verification {status === 'verified' ? 'Passed' : status === 'unverified' ? 'Failed' : 'Needs Review'}</h3>
            <div className="flex items-center space-x-1">
              <div className="text-xs text-gray-500">Score:</div>
              <div className={`text-sm font-medium ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                {score}/100
              </div>
            </div>
          </div>
          
          {/* Confidence score bar */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${
                score >= 70 ? 'bg-green-600' : 
                score >= 40 ? 'bg-yellow-600' : 
                'bg-red-600'
              }`} 
              style={{width: `${score}%`}}
            ></div>
          </div>
          
          {/* Verification notes */}
          <div className="mt-3">
            <p className="text-sm text-gray-700">{notes}</p>
          </div>
          
          {/* Verification results */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Order Match</h4>
              <div className="flex items-center">
                {matchesOrder ? (
                  <>
                    <svg className="w-5 h-5 text-green-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">Items match order</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-yellow-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium">Item verification needed</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Detected issues */}
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Issues Detected</h4>
              <div>
                {detectedIssues.length > 0 ? (
                  <ul className="text-sm text-gray-700">
                    {detectedIssues.slice(0, 2).map((issue, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="w-4 h-4 text-red-500 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{issue}</span>
                      </li>
                    ))}
                    {detectedIssues.length > 2 && (
                      <li className="text-xs text-gray-500 mt-1">{detectedIssues.length - 2} more issue(s)</li>
                    )}
                  </ul>
                ) : (
                  <span className="text-sm text-gray-500">None detected</span>
                )}
              </div>
            </div>
            
            {/* Recommendation */}
            <div className="bg-white p-3 rounded-md border border-gray-200">
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Recommendation</h4>
              <div>{getRecommendationDisplay(recommendation)}</div>
            </div>
          </div>
          
          {/* Flagged issues requiring manual review */}
          {flaggedIssues.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-md p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-1 flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Requires Manual Review
              </h4>
              <ul className="mt-1 text-sm text-yellow-700">
                {flaggedIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start mt-1">
                    <svg className="w-4 h-4 text-yellow-600 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ImageVerificationStatus;
