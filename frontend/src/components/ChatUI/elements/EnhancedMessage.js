import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { parseMessageWithCards, containsCardData } from '../utils/parseMessageWithCards';
import renderStructuredData from '../utils/renderStructuredData';

/**
 * Component for rendering messages that may contain embedded structured data
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - The message text
 * @param {boolean} props.isUser - Whether the message is from the user
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The rendered message
 */
const EnhancedMessage = ({ text, isUser, className = '' }) => {
  // Animation for the AI icon
  const iconAnimation = {
    y: [0, -5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };
  // Enhanced card detection logic
  useEffect(() => {
    // Log for debugging when message contains potential card data
    if (text && text.includes('refund') && text.includes('approved')) {
      console.log("[ENHANCED MESSAGE] Detected potential refund information:", text.substring(0, 100));
    }
    
    if (text && text.includes(':::refund_status{')) {
      console.log("[ENHANCED MESSAGE] Found explicit refund_status card format");
    }
  }, [text]);
  
  // If the message doesn't contain card data, render as normal markdown
  if (!text || !containsCardData(text)) {
    // Special case for refund-related messages that might not be properly formatted
    if (text && text.toLowerCase().includes('refund') && 
       (text.toLowerCase().includes('approved') || text.toLowerCase().includes('processed'))) {
      
      console.log("[ENHANCED MESSAGE] Detected refund information in text, attempting to extract");
      try {
        // Try to extract refund information from plain text
        const refundData = extractRefundDataFromText(text);
        if (refundData) {
          return (
            <div className={`chat-message ${className}`}>
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text.split('Your refund has been')[0]}
                </ReactMarkdown>
              </div>
              <div className="card-container my-2">
                {renderStructuredData({
                  type: 'refund_status',
                  data: refundData
                })}
              </div>
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {text.includes('Is there anything') ? 
                   `Is there anything else I can help you with today?` : ''}
                </ReactMarkdown>
              </div>
            </div>
          );
        }
      } catch (e) {
        console.error("[ENHANCED MESSAGE] Failed to extract refund data:", e);
      }
    }
    
    return (
      <div className={`chat-message ${className}`}>
        <div className="markdown-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Parse the message to separate text and card components
  const parts = parseMessageWithCards(text);

  // We'll keep track of continuous text parts to group them into a single bubble
  let currentTextGroup = [];
  const messageSegments = [];

  // Function to flush the current text group into a message segment
  const flushTextGroup = () => {
    if (currentTextGroup.length > 0) {
      messageSegments.push({
        type: 'text-group',
        parts: [...currentTextGroup]
      });
      currentTextGroup = [];
    }
  };

  // Process parts in original sequence to maintain conversation flow
  parts.forEach((part, index) => {
    if (part.type === 'text') {
      // Only add non-empty text parts
      if (part.content && part.content.trim().length > 0) {
        currentTextGroup.push(part);
      }
    } else if (part.type === 'card') {
      // When we encounter a card, flush any accumulated text first
      flushTextGroup();
      
      // Then add the card as its own segment
      messageSegments.push({
        type: 'card',
        cardType: part.cardType,
        cardData: part.cardData,
        index: index // Keep track of original position for animations
      });
    }
  });
  
  // Flush any remaining text
  flushTextGroup();
  
  return (
    <div className="message-segments-wrapper">
      {messageSegments.map((segment, index) => {
        if (segment.type === 'text-group') {
          // Render text group as a chat bubble
          return (
            <div key={`text-group-${index}`} className={`chat-message ${className} mb-3`}>
              {segment.parts.map((textPart, textIndex) => (
                <div key={`text-${textIndex}`} className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {textPart.content}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          );
        } else if (segment.type === 'card') {
          // Render card outside of chat bubble
          const cardProps = {
            type: segment.cardType,
            data: segment.cardData
          };
          
          return (
            <div key={`card-${index}`} className="cards-container w-full my-3 animate-cards-entrance">
              <motion.div 
                className="card-wrapper mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                whileHover={{ 
                  y: -4,
                  boxShadow: "0 12px 25px rgba(0, 0, 0, 0.07)",
                  transition: { duration: 0.2 }
                }}
              >
                {renderStructuredData(cardProps)}
              </motion.div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

/**
 * Helper function to extract refund data from plain text message
 * @param {string} text - The text message containing refund information 
 * @returns {Object|null} - Extracted refund data or null if not found
 */
function extractRefundDataFromText(text) {
  try {
    if (!text) return null;
    
    // Check if message appears to be about a refund
    const isRefundMessage = 
      text.toLowerCase().includes('refund') && 
      (text.toLowerCase().includes('approved') || 
       text.toLowerCase().includes('process'));
    
    if (!isRefundMessage) return null;
    
    // Extract order ID
    let orderId = "Unknown";
    const orderIdMatch = text.match(/Order #([0-9a-zA-Z]+)/);
    if (orderIdMatch && orderIdMatch[1]) {
      orderId = orderIdMatch[1];
    }
    
    // Extract amount
    let amount = 0;
    const amountMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    
    // Extract reason
    let reason = "Food quality issue";
    if (text.toLowerCase().includes('cold')) {
      reason = "Food was delivered cold";
    } else if (text.toLowerCase().includes('wrong')) {
      reason = "Wrong items delivered";
    } else if (text.toLowerCase().includes('missing')) {
      reason = "Missing items from order";
    } else if (text.toLowerCase().includes('quality')) {
      reason = "Food quality issue";
    }
    
    // Determine status
    let status = "pending";
    if (text.toLowerCase().includes('approved')) {
      status = "approved";
    } else if (text.toLowerCase().includes('process')) {
      status = "processing";
    } else if (text.toLowerCase().includes('reject')) {
      status = "rejected";
    }
    
    // Create refund data object
    return {
      order_id: orderId,
      status: status,
      amount: amount,
      reason: reason,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("[EXTRACT REFUND] Error extracting refund data:", e);
    return null;
  }
}

export default EnhancedMessage;
