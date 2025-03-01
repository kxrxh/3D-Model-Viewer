import React, { useState } from 'react';
import { exportAsJson, createPackage } from '../../../utils/assemblyExport';

const ExportDialog = ({ isOpen, onClose, assemblyStates, modelParts, modelUrl, modelFile }) => {
  const [exportOption, setExportOption] = useState('json');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Handle the export based on selected option
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Prepare the assembly instructions object
      const assemblyInstructions = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        assemblyStages: assemblyStates.map((state, index) => ({
          id: index + 1,
          name: state.name,
          description: state.description || "",
          parts: state.parts
        })),
        // Include all available model parts for reference
        availableParts: Object.keys(modelParts),
      };

      if (exportOption === 'json') {
        // Export just the JSON
        exportAsJson(assemblyInstructions);
      } else if (exportOption === 'package') {
        // Create a package with both JSON and model file
        if (!modelFile && modelUrl) {
          // If we have a URL but not the file, fetch the file
          const response = await fetch(modelUrl);
          const blob = await response.blob();
          
          // Get filename from URL
          const fileName = modelUrl.substring(modelUrl.lastIndexOf('/') + 1) || 'model.glb';
          
          await createPackage(assemblyInstructions, blob, fileName);
        } else if (modelFile) {
          // If we already have the file
          await createPackage(
            assemblyInstructions, 
            modelFile, 
            modelFile.name || 'model.glb'
          );
        } else {
          throw new Error('Модель не найдена');
        }
      }
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setError(error.message || 'Ошибка при экспорте');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Dialog Content */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Экспорт инструкций сборки</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isExporting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Выберите формат экспорта:
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                value="json"
                checked={exportOption === 'json'}
                onChange={() => setExportOption('json')}
                className="h-5 w-5 text-red-700 focus:ring-red-700"
                disabled={isExporting}
              />
              <div>
                <span className="block font-medium text-gray-800">Только JSON</span>
                <span className="block text-sm text-gray-500">
                  Экспорт только файла с инструкциями сборки
                </span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer border border-gray-200 hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                value="package"
                checked={exportOption === 'package'}
                onChange={() => setExportOption('package')}
                className="h-5 w-5 text-red-700 focus:ring-red-700"
                disabled={isExporting}
              />
              <div>
                <span className="block font-medium text-gray-800">Полный пакет (ZIP)</span>
                <span className="block text-sm text-gray-500">
                  Экспорт ZIP-архива, содержащего инструкции сборки и 3D модель
                </span>
              </div>
            </label>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all duration-200"
            disabled={isExporting}
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Экспорт...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспортировать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog; 