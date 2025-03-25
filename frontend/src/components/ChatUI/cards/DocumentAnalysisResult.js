import React from 'react';
import '../styles/cardAnimations.css';

/**
 * Component to render document analysis results in a structured format
 * 
 * @param {Object} props - Component props
 * @param {Object} props.analysis - The analysis result object containing document data
 * @returns {JSX.Element} - Rendered component
 */
const DocumentAnalysisResult = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 my-2 shadow-sm">
        <p className="font-medium">Error: No analysis data provided</p>
      </div>
    );
  }

  // Handle error state
  if (analysis.error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 my-2 shadow-sm">
        <p className="font-medium">Analysis Error</p>
        <p>{analysis.error}</p>
      </div>
    );
  }

  // Determine document type for specialized rendering
  const documentType = (analysis.document_type || '').toLowerCase();
  const confidence = analysis.analysis_confidence || 0;

  const renderConfidenceBar = (confidence) => {
    let colorClass = 'bg-red-500';
    if (confidence > 80) colorClass = 'bg-green-500';
    else if (confidence > 50) colorClass = 'bg-yellow-500';

    return (
      <div className="mt-2 mb-4">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700 mr-2">Confidence:</span>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${colorClass}`} 
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <span className="text-sm ml-2">{confidence}%</span>
        </div>
      </div>
    );
  };

  const renderIllegibleParts = (parts) => {
    if (!parts || parts.length === 0) return null;
    
    return (
      <div className="mt-3 bg-yellow-50 border border-yellow-100 p-2 rounded-md">
        <p className="text-yellow-700 font-medium text-sm">Illegible sections:</p>
        <ul className="list-disc pl-5 text-sm text-yellow-800">
          {parts.map((part, idx) => (
            <li key={idx}>{part}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Render prescription specific view
  if (documentType === 'prescription') {
    const { patient_info, doctor_info, medications = [], date, diagnosis, follow_up, special_notes, illegible_parts } = analysis;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 my-2 shadow-sm fade-in-card">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-blue-800">Medical Prescription</h3>
          {date && <div className="text-sm text-gray-500">{date}</div>}
        </div>
        
        {renderConfidenceBar(confidence)}
        
        <div className="grid md:grid-cols-2 gap-4">
          {patient_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Patient</h4>
              <p>{patient_info.name || 'Not specified'}</p>
              {patient_info.age && <p className="text-sm text-gray-600">Age: {patient_info.age}</p>}
              {patient_info.gender && <p className="text-sm text-gray-600">Gender: {patient_info.gender}</p>}
              {patient_info.other_details && <p className="text-sm text-gray-600">{patient_info.other_details}</p>}
            </div>
          )}
          
          {doctor_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Doctor</h4>
              <p>{doctor_info.name || 'Not specified'}</p>
              {doctor_info.credentials && <p className="text-sm text-gray-600">{doctor_info.credentials}</p>}
              {doctor_info.hospital && <p className="text-sm text-gray-600">{doctor_info.hospital}</p>}
            </div>
          )}
        </div>
        
        {diagnosis && (
          <div className="mt-3 border-b pb-2">
            <h4 className="font-medium text-gray-700">Diagnosis</h4>
            <p>{diagnosis}</p>
          </div>
        )}
        
        {medications && medications.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Medications</h4>
            <div className="mt-2 space-y-3">
              {medications.map((med, idx) => (
                <div key={idx} className="bg-blue-50 p-2 rounded-md">
                  <div className="font-medium">{med.name}</div>
                  <div className="grid grid-cols-3 gap-1 text-sm mt-1">
                    {med.dosage && <div><span className="text-gray-500">Dosage:</span> {med.dosage}</div>}
                    {med.frequency && <div><span className="text-gray-500">Frequency:</span> {med.frequency}</div>}
                    {med.duration && <div><span className="text-gray-500">Duration:</span> {med.duration}</div>}
                  </div>
                  {med.notes && <div className="text-sm mt-1 text-gray-600">{med.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {follow_up && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Follow-up</h4>
            <p>{follow_up}</p>
          </div>
        )}
        
        {special_notes && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Special Instructions</h4>
            <p>{special_notes}</p>
          </div>
        )}
        
        {renderIllegibleParts(illegible_parts)}
      </div>
    );
  }
  
  // Render lab report specific view
  if (documentType === 'lab_report') {
    const { patient_info, lab_info, test_results = [], comments, date, physician, illegible_parts } = analysis;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 my-2 shadow-sm fade-in-card">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-green-800">Lab Report Results</h3>
          {date && <div className="text-sm text-gray-500">{date}</div>}
        </div>
        
        {renderConfidenceBar(confidence)}
        
        <div className="grid md:grid-cols-2 gap-4">
          {patient_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Patient</h4>
              <p>{patient_info.name || 'Not specified'}</p>
              {patient_info.age && <p className="text-sm text-gray-600">Age: {patient_info.age}</p>}
              {patient_info.gender && <p className="text-sm text-gray-600">Gender: {patient_info.gender}</p>}
              {patient_info.id && <p className="text-sm text-gray-600">ID: {patient_info.id}</p>}
            </div>
          )}
          
          {lab_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Laboratory</h4>
              <p>{lab_info.name || 'Not specified'}</p>
              {lab_info.contact && <p className="text-sm text-gray-600">{lab_info.contact}</p>}
            </div>
          )}
        </div>
        
        {test_results && test_results.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <h4 className="font-medium text-gray-700">Test Results</h4>
            <table className="min-w-full mt-2 divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parameter
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Normal Range
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {test_results.map((test, idx) => {
                  let statusClass = '';
                  if (test.status === 'high') statusClass = 'text-red-600';
                  else if (test.status === 'low') statusClass = 'text-blue-600';
                  else if (test.status === 'normal') statusClass = 'text-green-600';
                  
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {test.parameter}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {test.result}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {test.normal_range || 'N/A'}
                      </td>
                      <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${statusClass}`}>
                        {test.status ? test.status.toUpperCase() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {comments && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Comments</h4>
            <p className="text-sm">{comments}</p>
          </div>
        )}
        
        {physician && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Physician</h4>
            <p>{physician}</p>
          </div>
        )}
        
        {renderIllegibleParts(illegible_parts)}
      </div>
    );
  }
  
  // Render diet plan specific view
  if (documentType === 'diet_plan') {
    const {
      patient_info,
      nutritionist_info,
      dietary_goals,
      calorie_target,
      meal_plan = [],
      foods_recommended = [],
      foods_to_avoid = [],
      special_instructions,
      duration,
      illegible_parts
    } = analysis;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 my-2 shadow-sm fade-in-card">
        <h3 className="text-lg font-semibold text-purple-800">Diet Plan</h3>
        
        {renderConfidenceBar(confidence)}
        
        <div className="grid md:grid-cols-2 gap-4">
          {patient_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Patient</h4>
              <p>{patient_info.name || 'Not specified'}</p>
              {patient_info.other_details && <p className="text-sm text-gray-600">{patient_info.other_details}</p>}
            </div>
          )}
          
          {nutritionist_info && (
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-700">Nutritionist</h4>
              <p>{nutritionist_info.name || 'Not specified'}</p>
              {nutritionist_info.credentials && <p className="text-sm text-gray-600">{nutritionist_info.credentials}</p>}
            </div>
          )}
        </div>
        
        {dietary_goals && (
          <div className="mt-3 border-b pb-2">
            <h4 className="font-medium text-gray-700">Dietary Goals</h4>
            <p>{dietary_goals}</p>
          </div>
        )}
        
        {calorie_target && (
          <div className="mt-3 border-b pb-2">
            <h4 className="font-medium text-gray-700">Calorie Target</h4>
            <p>{calorie_target}</p>
          </div>
        )}
        
        {foods_recommended && foods_recommended.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Recommended Foods</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {foods_recommended.map((food, idx) => (
                <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {food}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {foods_to_avoid && foods_to_avoid.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Foods to Avoid</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {foods_to_avoid.map((food, idx) => (
                <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                  {food}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {meal_plan && meal_plan.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Meal Plan</h4>
            <div className="grid gap-3 mt-2">
              {meal_plan.map((meal, idx) => (
                <div key={idx} className="bg-purple-50 p-3 rounded-md">
                  <h5 className="font-medium text-purple-800">{meal.meal}</h5>
                  {meal.foods && meal.foods.length > 0 && (
                    <ul className="list-disc pl-5 mt-1">
                      {meal.foods.map((food, foodIdx) => (
                        <li key={foodIdx} className="text-sm">
                          {food} {meal.portions && foodIdx === 0 ? `(${meal.portions})` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {meal.notes && <p className="text-sm mt-1 text-gray-600">{meal.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {special_instructions && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Special Instructions</h4>
            <p>{special_instructions}</p>
          </div>
        )}
        
        {duration && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Duration</h4>
            <p>{duration}</p>
          </div>
        )}
        
        {renderIllegibleParts(illegible_parts)}
      </div>
    );
  }
  
  // For dietary recommendations format
  if (analysis.foods_to_emphasize || analysis.dietary_approach || analysis.condition) {
    const {
      condition,
      restrictions = [],
      dietary_approach,
      foods_to_emphasize = [],
      foods_to_limit = [],
      meal_plan,
      special_considerations,
      scientific_rationale
    } = analysis;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 my-2 shadow-sm fade-in-card">
        <h3 className="text-lg font-semibold text-purple-800">
          Dietary Recommendations for {condition}
        </h3>
        
        {restrictions && restrictions.length > 0 && (
          <div className="bg-yellow-50 p-2 rounded-md mt-2">
            <p className="text-sm font-medium">
              <span className="text-yellow-800">Dietary Restrictions:</span> {restrictions.join(", ")}
            </p>
          </div>
        )}
        
        {dietary_approach && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Recommended Dietary Approach</h4>
            <p className="text-sm">{dietary_approach}</p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {foods_to_emphasize && foods_to_emphasize.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700">Foods to Emphasize</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {foods_to_emphasize.map((food, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {foods_to_limit && foods_to_limit.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700">Foods to Limit/Avoid</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {foods_to_limit.map((food, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {meal_plan && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-700">Sample Meal Plan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {meal_plan.breakfast && meal_plan.breakfast.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <h5 className="font-medium text-purple-800">Breakfast</h5>
                  <ul className="list-disc pl-5 mt-1">
                    {meal_plan.breakfast.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meal_plan.lunch && meal_plan.lunch.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <h5 className="font-medium text-purple-800">Lunch</h5>
                  <ul className="list-disc pl-5 mt-1">
                    {meal_plan.lunch.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meal_plan.dinner && meal_plan.dinner.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <h5 className="font-medium text-purple-800">Dinner</h5>
                  <ul className="list-disc pl-5 mt-1">
                    {meal_plan.dinner.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meal_plan.snacks && meal_plan.snacks.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <h5 className="font-medium text-purple-800">Snacks</h5>
                  <ul className="list-disc pl-5 mt-1">
                    {meal_plan.snacks.map((item, idx) => (
                      <li key={idx} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {special_considerations && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-gray-700">Special Considerations</h4>
            <p className="text-sm">{special_considerations}</p>
          </div>
        )}
        
        {scientific_rationale && (
          <div className="mt-3 border-t pt-2 text-gray-600">
            <h4 className="font-medium text-gray-700">Scientific Rationale</h4>
            <p className="text-sm">{scientific_rationale}</p>
          </div>
        )}
      </div>
    );
  }
  
  // Generic document analysis fallback view
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 my-2 shadow-sm fade-in-card">
      <h3 className="text-lg font-semibold text-gray-800">Document Analysis</h3>
      <p className="text-sm text-gray-500">Document Type: {documentType || 'Unknown'}</p>
      
      {renderConfidenceBar(confidence)}
      
      <div className="mt-3">
        <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      </div>
      
      {renderIllegibleParts(analysis.illegible_parts)}
    </div>
  );
};

export default DocumentAnalysisResult;
