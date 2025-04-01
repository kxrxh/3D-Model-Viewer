import React from "react";
import { FiRefreshCw } from "react-icons/fi";
import { VscGraph } from "react-icons/vsc";

interface ControlPanelProps {
	resetView: () => void;
	showStats: boolean;
	setShowStats: (show: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = React.memo(
	({ resetView, showStats, setShowStats }) => (
		<div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2.5 z-10">
			<button
				type="button"
				onClick={resetView}
				className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 text-sm"
			>
				<FiRefreshCw size={16} title="Reset View" />
				Сбросить вид
			</button>
			<button
				type="button"
				onClick={() => setShowStats(!showStats)}
				className={`px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 text-sm ${
					showStats ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-700"
				}`}
			>
				<VscGraph size={16} title="Statistics" />
				Статистика
			</button>
		</div>
	),
);

export default ControlPanel;
