import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Displays refund status with Swiggy-inspired styling and visual progress indicators
 * Improved error handling for different data formats
 */
const RefundStatus = ({ refund }) => {
  const SWIGGY_ORANGE = "#FC8019";
  const SWIGGY_DARK_GRAY = "#3D4152";
  
  // Enhanced normalization to handle different formats and nested structures
  const normalizedRefund = useMemo(() => {
    console.log("[RefundStatus] Received refund data:", refund);
    
    // Handle null/undefined
    if (!refund) {
      console.error("[RefundStatus] Received null/undefined refund data");
      return {
        order_id: "Unknown",
        status: "Pending",
        amount: 0,
        reason: "No details available",
        timestamp: new Date().toISOString()
      };
    }
    
    // Handle nested refund data in type/data structure
    const refundData = refund.data && refund.type === 'refund_status' ? refund.data : refund;
    console.log("[RefundStatus] Processing refund data:", refundData);
    
    // Extract order ID with better fallbacks
    let orderId = refundData.order_id || refundData.orderId || refundData.id || "Unknown";
    if (typeof orderId === 'object' && orderId !== null) {
      // Handle case where order_id might be an object
      orderId = orderId.toString() || "Unknown";
    }
    
    // Extract status with better detection and normalization
    let status = refundData.status || refundData.refund_status || "Processing";
    
    // Status might be in a nested object
    if (refundData.refund && refundData.refund.status) {
      status = refundData.refund.status;
    }
    
    // Extract amount with enhanced fallbacks
    let amount = 0;
    if (typeof refundData.amount === 'number') {
      amount = refundData.amount;
    } else if (refundData.amount && !isNaN(parseFloat(refundData.amount))) {
      amount = parseFloat(refundData.amount);
    } else if (typeof refundData.refund_amount === 'number') {
      amount = refundData.refund_amount;
    } else if (refundData.refund_amount && !isNaN(parseFloat(refundData.refund_amount))) {
      amount = parseFloat(refundData.refund_amount);
    } else if (refundData.total && !isNaN(parseFloat(refundData.total))) {
      amount = parseFloat(refundData.total);
    }
    
    // Extract reason with enhanced fallbacks
    let reason = refundData.reason || refundData.description || refundData.message || 
                 refundData.refund_reason || "Refund requested";
                 
    if (refundData.refund && refundData.refund.reason) {
      reason = refundData.refund.reason;
    }
    
    // Debug information about what we found
    console.log("[RefundStatus] Extracted order_id:", orderId);
    console.log("[RefundStatus] Extracted status:", status);
    console.log("[RefundStatus] Extracted amount:", amount);
    
    // Create a normalized data object with defaults
    return {
      order_id: orderId,
      status: status,
      amount: amount,
      reason: reason,
      timestamp: refundData.timestamp || refundData.created_at || refundData.date || new Date().toISOString(),
      estimated_days: refundData.estimated_days || refundData.processingTime || 
                      (status.toLowerCase() === "approved" ? 0 : 3)
    };
  }, [refund]);
  
  // Get status details based on status string
  const getStatusInfo = (status) => {
    const statusMap = {
      'approved': { 
        label: 'Approved',
        color: '#48C479',
        bgColor: '#E5F8EC',
        progress: 100
      },
      'processing': { 
        label: 'Processing',
        color: '#DB7C38',
        bgColor: '#FFF8DB',
        progress: 60
      },
      'pending': {
        label: 'Pending',
        color: '#DB7C38',
        bgColor: '#FFF8DB',
        progress: 30
      },
      'initiated': {
        label: 'Initiated',
        color: '#5D8ED5',
        bgColor: '#EDF1F7',
        progress: 15
      },
      'rejected': {
        label: 'Rejected', 
        color: '#D63B2D',
        bgColor: '#F7E9EB',
        progress: 100
      }
    };
    
    // Normalize status string
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    return statusMap[normalizedStatus] || { 
      label: status || 'Processing',
      color: '#5D8ED5',
      bgColor: '#EDF1F7',
      progress: 50
    };
  };
  
  const statusInfo = getStatusInfo(normalizedRefund.status);
  
  // Format date in a readable way
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (e) {
      return 'Date unavailable';
    }
  };
  
  // Format amount with rupee symbol
  const formatAmount = (amount) => {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <motion.div 
      className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm mb-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center" 
           style={{ background: "#FBFBFB" }}>
        <div className="w-8 h-8 rounded-full mr-3 flex items-center justify-center" 
             style={{ backgroundColor: statusInfo.bgColor }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" 
               stroke={statusInfo.color} style={{ color: statusInfo.color }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Refund Status</h3>
          <p className="text-xs text-gray-500">Order #{normalizedRefund.order_id}</p>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4">
        {/* Status and Amount */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start">
            <div className="mr-3">
              <span className="text-xs font-medium text-gray-500">STATUS</span>
              <div 
                className="mt-1 px-2.5 py-1 rounded-full text-xs font-medium" 
                style={{ 
                  color: statusInfo.color, 
                  backgroundColor: statusInfo.bgColor
                }}
              >
                {statusInfo.label}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">DATE</span>
              <div className="mt-1 text-sm font-medium text-gray-800">
                {formatDate(normalizedRefund.timestamp)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-gray-500">AMOUNT</span>
            <div className="mt-1 text-lg font-bold" style={{ color: SWIGGY_ORANGE }}>
              {formatAmount(normalizedRefund.amount)}
            </div>
          </div>
        </div>
        
        {/* Progress bar for pending/processing */}
        {['processing', 'pending', 'initiated'].includes(normalizedRefund.status.toLowerCase()) && (
          <div className="mt-3 mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">Refund in progress</span>
              <span className="text-gray-500">
                Est. {normalizedRefund.estimated_days} days remaining
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <motion.div 
                className="h-1.5 rounded-full" 
                style={{ backgroundColor: statusInfo.color }}
                initial={{ width: 0 }}
                animate={{ width: `${statusInfo.progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              ></motion.div>
            </div>
          </div>
        )}
        
        {/* Reason */}
        <div className="mt-4">
          <span className="text-xs font-medium text-gray-500">REASON</span>
          <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
            {normalizedRefund.reason}
          </div>
        </div>
        
        {/* Additional info for different statuses */}
        {normalizedRefund.status.toLowerCase() === 'approved' && (
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#E5F8EC' }}>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="#48C479">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#48C479' }}>
                Refund has been processed to your payment method
              </span>
            </div>
          </div>
        )}
        
        {normalizedRefund.status.toLowerCase() === 'rejected' && (
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#F7E9EB' }}>
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 mr-2" viewBox="0 0 20 20" fill="#D63B2D">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-sm font-medium block" style={{ color: '#D63B2D' }}>
                  Refund request has been declined
                </span>
                <span className="text-xs block mt-1 text-gray-600">
                  For more information, please contact customer support
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Refund ID: {normalizedRefund.refund_id || `RF${Math.random().toString().slice(2, 10)}`}
          </span>
          <button 
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ color: SWIGGY_ORANGE }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RefundStatus;
