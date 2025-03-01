/**
 * Component for uploading 3D models
 */
const ModelUploader = ({ onFileUpload }) => (
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-2xl">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">3D Viewer</h2>
    <label
      htmlFor="model-upload"
      className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-red-700 text-white rounded-lg cursor-pointer hover:bg-red-800 transition-all duration-300 mb-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      Загрузить 3D модель
    </label>
    <input
      id="model-upload"
      type="file"
      accept=".glb,.gltf"
      onChange={onFileUpload}
      className="hidden"
    />
    <p className="text-gray-600 mt-2.5">Поддерживаемые форматы: GLB, GLTF</p>
  </div>
);

export default ModelUploader; 