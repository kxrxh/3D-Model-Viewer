/**
 * View mode selector component
 */
const ViewModeSelector = ({ viewMode, setViewMode }) => (
  <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10 w-80">
    <div className="gap-2 w-full text-center font-medium text-gray-700">
      Режим отображения
    </div>
    <div className="flex gap-1 bg-gray-100 rounded-md p-1">
      <label className="relative flex-1">
        <input
          type="radio"
          value="cumulative"
          checked={viewMode === 'cumulative'}
          onChange={() => setViewMode('cumulative')}
          className="sr-only peer"
        />
        <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block text-center transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
          Последовательный
        </span>
      </label>
      <label className="relative flex-1">
        <input
          type="radio"
          value="isolated"
          checked={viewMode === 'isolated'}
          onChange={() => setViewMode('isolated')}
          className="sr-only peer"
        />
        <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block text-center transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
          Изолированный
        </span>
      </label>
    </div>
  </div>
);

export default ViewModeSelector; 