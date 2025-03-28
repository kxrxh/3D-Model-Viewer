import React, { useState } from "react";
import { getAllDescendantPaths } from "../../../utils/treeUtils";

/**
 * Tree node component for part selection
 */
function TreeNode({
	node,
	selectedParts,
	setSelectedParts,
	globalSelectedParts,
	depth = 0,
}) {
	const [expanded, setExpanded] = useState(true);
	const hasChildren = Object.keys(node.children).length > 0;
	const isInGlobal =
		globalSelectedParts && globalSelectedParts.includes(node.fullPath);
	const isInSelected = selectedParts.includes(node.fullPath);
	const isGlobalOnly = isInGlobal && !isInSelected;

	// Only show checked if actually selected in current selection, not just in global
	const isChecked = isInSelected;
	const showBackground = isInSelected || isInGlobal;

	const handleToggle = () => {
		const descendantPaths = getAllDescendantPaths(node);

		if (isInSelected) {
			// If in current selection, remove it
			setSelectedParts((prev) =>
				prev.filter((p) => !descendantPaths.includes(p)),
			);
		} else {
			// If not in current selection, add it
			// This includes adding back items that are only in global selections
			setSelectedParts((prev) =>
				Array.from(new Set([...prev, ...descendantPaths])),
			);
		}
	};

	return (
		<div className="relative">
			<div
				className={`flex items-center rounded py-1.5 ${depth === 0 ? "mb-1" : ""} transition-colors 
                   ${showBackground ? "bg-red-50" : "hover:bg-gray-50"}`}
			>
				{hasChildren && (
					<button
						onClick={() => setExpanded(!expanded)}
						className="mr-1 h-5 w-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className={`h-4 w-4 transition-transform ${expanded ? "transform rotate-90" : ""}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				)}
				{!hasChildren && <div className="mr-1 w-5" />}
				<div className="relative flex items-center">
					<input
						type="checkbox"
						checked={isChecked}
						onChange={handleToggle}
						className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 
              checked:border-red-500 checked:bg-red-700 
              hover:border-red-500 transition-all duration-200"
					/>
					<svg
						className={`pointer-events-none absolute h-5 w-5 opacity-0 ${isChecked ? "opacity-100" : ""} text-white`}
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
				</div>
				<span
					className={`ml-2 select-none truncate text-sm ${isGlobalOnly ? "text-gray-500 italic" : ""}`}
					title={node.name}
				>
					{node.name}
				</span>
			</div>

			{hasChildren && expanded && (
				<div
					className={`pl-6 ${depth > 0 ? "ml-4 border-l border-gray-200" : ""}`}
				>
					{Object.values(node.children).map((child) => (
						<TreeNode
							key={child.fullPath}
							node={child}
							selectedParts={selectedParts}
							setSelectedParts={setSelectedParts}
							globalSelectedParts={globalSelectedParts}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export default TreeNode;
