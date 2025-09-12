import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ConflictData {
  field: string;
  localValue: any;
  serverValue: any;
  resolvedValue?: any;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolvedData: any) => void;
  conflictData: {
    collection: string;
    docId: string;
    localData: any;
    serverData: any;
  };
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  conflictData
}) => {
  const [resolvedData, setResolvedData] = useState<any>({});
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);

  React.useEffect(() => {
    if (isOpen && conflictData) {
      // Identify conflicts between local and server data
      const detectedConflicts: ConflictData[] = [];
      const resolved: any = { ...conflictData.serverData };

      // Compare fields and identify conflicts
      Object.keys(conflictData.localData).forEach(key => {
        if (key.startsWith('_')) return; // Skip metadata fields
        
        const localValue = conflictData.localData[key];
        const serverValue = conflictData.serverData[key];
        
        if (localValue !== serverValue && localValue !== undefined) {
          detectedConflicts.push({
            field: key,
            localValue,
            serverValue,
            resolvedValue: localValue // Default to local value
          });
          resolved[key] = localValue;
        }
      });

      setConflicts(detectedConflicts);
      setResolvedData(resolved);
    }
  }, [isOpen, conflictData]);

  const handleFieldResolution = (field: string, value: any) => {
    setResolvedData((prev: any) => ({
      ...prev,
      [field]: value
    }));

    setConflicts(prev => prev.map(conflict => 
      conflict.field === field 
        ? { ...conflict, resolvedValue: value }
        : conflict
    ));
  };

  const handleResolveAll = () => {
    onResolve(resolvedData);
    onClose();
  };

  const handleUseLocal = () => {
    onResolve(conflictData.localData);
    onClose();
  };

  const handleUseServer = () => {
    onResolve(conflictData.serverData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Data Conflict Detected</h2>
              <p className="text-sm text-gray-600">
                {conflictData.collection}/{conflictData.docId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              The data you're trying to save conflicts with changes made by another user or device. 
              Please review the conflicts below and choose how to resolve them.
            </p>
          </div>

          {/* Conflict Fields */}
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {conflict.field.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Local Version */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-600">Your Version</label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-800">
                        {typeof conflict.localValue === 'object' 
                          ? JSON.stringify(conflict.localValue, null, 2)
                          : String(conflict.localValue)
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => handleFieldResolution(conflict.field, conflict.localValue)}
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        resolvedData[conflict.field] === conflict.localValue
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      Use This
                    </button>
                  </div>

                  {/* Server Version */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-green-600">Server Version</label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-gray-800">
                        {typeof conflict.serverValue === 'object' 
                          ? JSON.stringify(conflict.serverValue, null, 2)
                          : String(conflict.serverValue)
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => handleFieldResolution(conflict.field, conflict.serverValue)}
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        resolvedData[conflict.field] === conflict.serverValue
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      Use This
                    </button>
                  </div>

                  {/* Custom Resolution */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Custom Value</label>
                    <input
                      type="text"
                      value={resolvedData[conflict.field] || ''}
                      onChange={(e) => handleFieldResolution(conflict.field, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter custom value"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {conflicts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No conflicts detected. Data can be safely merged.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={handleUseServer}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Use Server Version
            </button>
            <button
              onClick={handleUseLocal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Use Your Version
            </button>
          </div>
          
          <button
            onClick={handleResolveAll}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Resolve Conflicts
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
