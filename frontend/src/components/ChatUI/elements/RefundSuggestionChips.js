import React from 'react';

/**
 * Component that displays suggestion chips for refund reasons
 * to make it easier for users to provide refund reasons
 */
const RefundSuggestionChips = ({ onSelect }) => {
  // Common refund reasons for food delivery
  const refundReasons = [
    { id: 'quality', label: 'Food quality issue' },
    { id: 'wrong_items', label: 'Wrong items delivered' },
    { id: 'missing', label: 'Missing items' },
    { id: 'damaged', label: 'Damaged packaging' },
    { id: 'late', label: 'Late delivery' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4 mt-1">
      {refundReasons.map((reason) => (
        <button
          key={reason.id}
          onClick={() => onSelect(reason.label)}
          className="px-3 py-1.5 text-sm bg-orange-50 text-orange-600 border border-orange-200 
                    hover:bg-orange-100 rounded-full transition-colors duration-200"
        >
          {reason.label}
        </button>
      ))}
    </div>
  );
};

export default RefundSuggestionChips;
