/**
 * Control panel with view reset and stats toggle
 */
const ControlPanel = ({ resetView, showStats, setShowStats }) => (
	<div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2.5 z-10">
		<button
			onClick={resetView}
			className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			Сбросить вид
		</button>
		<button
			onClick={() => setShowStats(!showStats)}
			className={`px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 ${
				showStats ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-700"
			}`}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			Статистика
		</button>
	</div>
);

export default ControlPanel;
