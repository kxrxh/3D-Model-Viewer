import React, { useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import type { PERFORMANCE_PROFILES } from "../hooks";

interface PerformanceProfileSelectorProps {
	profiles: typeof PERFORMANCE_PROFILES;
	activeProfile: string;
	setActiveProfile: (profile: string) => void;
}

const PerformanceProfileSelector: React.FC<PerformanceProfileSelectorProps> =
	React.memo(({ profiles, activeProfile, setActiveProfile }) => {
		const [isCollapsed, setIsCollapsed] = useState(true);

		return (
			<div className="flex flex-col bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-10 w-80">
				<button
					className="w-full text-sm font-medium text-gray-700 flex justify-between items-center cursor-pointer py-1"
					onClick={() => setIsCollapsed(!isCollapsed)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setIsCollapsed(!isCollapsed);
						}
					}}
					type="button"
				>
					<span>Качество</span>
					<div className="flex items-center">
						<span className="text-xs mr-1 text-gray-500">
							{profiles[activeProfile as keyof typeof profiles].name}
						</span>
						<span
							className={`transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"} inline-flex`}
						>
							<MdKeyboardArrowDown size={12} title="Toggle" />
						</span>
					</div>
				</button>

				{!isCollapsed && (
					<div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-gray-200">
						{Object.entries(profiles).map(([key, profile]) => (
							<label key={key} className="relative flex items-center">
								<input
									type="radio"
									value={key}
									checked={activeProfile === key}
									onChange={() => setActiveProfile(key)}
									className="sr-only peer"
								/>
								<span className="px-2 py-1 rounded cursor-pointer text-xs font-medium w-full text-left transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800 flex justify-between">
									<span>{profile.name}</span>
									{key === "auto" && (
										<span className="text-xs opacity-70 self-center ml-1">
											(А)
										</span>
									)}
								</span>
							</label>
						))}
					</div>
				)}
			</div>
		);
	});

export default PerformanceProfileSelector;
