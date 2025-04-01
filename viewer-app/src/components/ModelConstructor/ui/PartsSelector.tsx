import { useState, useCallback, useEffect } from "react";
import {
	IoSearchOutline,
	IoCloseOutline,
	IoRemoveOutline,
	IoAddOutline,
} from "react-icons/io5";

interface PartGroup {
	name: string;
	isGroup: true;
	parts: (PartGroup | PartDetail)[];
	expanded?: boolean;
}

interface PartDetail {
	originalName: string;
	displayName: string;
	isGroup?: false;
}

interface PartsSelectorProps {
	availableParts: string[];
	selectedParts: string[];
	onPartsChange: (parts: string[]) => void;
	onClose: () => void;
	truncateName?: (name: string, maxLength?: number) => string;
}

const PartsSelector: React.FC<PartsSelectorProps> = ({
	availableParts,
	selectedParts,
	onPartsChange,
	onClose,
	truncateName = (name) => name.split("/").pop() || name,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [groupsExpanded, setGroupsExpanded] = useState<Record<string, boolean>>(
		{},
	);
	const [localSelectedParts, setLocalSelectedParts] =
		useState<string[]>(selectedParts);

	// Update local state when prop changes
	useEffect(() => {
		setLocalSelectedParts(selectedParts);
	}, [selectedParts]);

	// Helper function to create a hierarchical structure from flat part names
	const groupPartsByHierarchy = (parts: string[]): PartGroup => {
		const root: PartGroup = {
			name: "root",
			isGroup: true,
			parts: [],
			expanded: true,
		};

		// Keep track of parts that are also groups to avoid duplicates
		const groupPaths = new Set<string>();

		// First pass: identify all groups
		for (const partName of parts) {
			const segments = partName.split("/").map((s) => s.trim());
			if (segments.length > 1) {
				// If this is a path with multiple segments, record all parent paths
				for (let i = 1; i < segments.length; i++) {
					groupPaths.add(segments.slice(0, i).join("/"));
				}
			}
		}

		// Second pass: create the actual hierarchy
		for (const partName of parts) {
			const segments = partName.split("/").map((s) => s.trim());
			let currentLevel = root;

			// Skip this part if it's already represented as a group
			if (segments.length === 1 && groupPaths.has(partName)) {
				continue;
			}

			// Handle all path segments except the last one (which is the actual part)
			for (let i = 0; i < segments.length - 1; i++) {
				const groupName = segments[i];
				// Check if this group already exists at current level
				let group = currentLevel.parts.find(
					(p) => "isGroup" in p && p.isGroup && p.name === groupName,
				) as PartGroup | undefined;

				// If not, create it
				if (!group) {
					group = {
						name: groupName,
						isGroup: true,
						parts: [],
						expanded:
							groupsExpanded[segments.slice(0, i + 1).join("/")] ?? true,
					};
					currentLevel.parts.push(group);
				}

				currentLevel = group;
			}

			// Store the original part name along with its display name (last segment)
			const lastSegment = segments[segments.length - 1];
			currentLevel.parts.push({
				originalName: partName,
				displayName: lastSegment,
				isGroup: false,
			});
		}

		return root;
	};

	// Toggle group expansion state
	const toggleGroupExpansion = (path: string) => {
		setGroupsExpanded((prev) => {
			const currentExpandedState = prev[path] ?? true;
			return {
				...prev,
				[path]: !currentExpandedState,
			};
		});
	};

	// Filter parts based on search query
	const filterParts = (parts: string[]): string[] => {
		if (!searchQuery) return parts;
		const query = searchQuery.toLowerCase();
		return parts.filter((part) => part.toLowerCase().includes(query));
	};

	// Recursive function to collect all part IDs in a group and its subgroups
	const collectPartIdsInGroup = useCallback((group: PartGroup): string[] => {
		let partIds: string[] = [];

		for (const part of group.parts) {
			if ("isGroup" in part && part.isGroup) {
				partIds = [...partIds, ...collectPartIdsInGroup(part)];
			} else if ("originalName" in part) {
				partIds.push(part.originalName);
			}
		}

		return partIds;
	}, []);

	// Determine the selection state of a group
	const getGroupSelectionState = useCallback(
		(group: PartGroup): "all" | "none" | "partial" => {
			const allPartIds = collectPartIdsInGroup(group);
			if (allPartIds.length === 0) return "none"; // Empty group

			const selectedCount = allPartIds.filter((id) =>
				selectedParts.includes(id),
			).length;

			if (selectedCount === 0) return "none";
			if (selectedCount === allPartIds.length) return "all";
			return "partial";
		},
		[selectedParts, collectPartIdsInGroup],
	);

	// Handle part selection
	const handlePartSelection = (partName: string, isSelected: boolean) => {
		const newSelectedParts = isSelected
			? [...localSelectedParts, partName]
			: localSelectedParts.filter((p) => p !== partName);
		setLocalSelectedParts(newSelectedParts);
		onPartsChange(newSelectedParts);
	};

	// Handle Done button click
	const handleDone = () => {
		onClose();
	};

	// Handle group selection
	const handleGroupSelectionToggle = useCallback(
		(group: PartGroup) => {
			const allPartIds = collectPartIdsInGroup(group);
			const groupState = getGroupSelectionState(group);

			let newSelectedParts: string[];

			if (groupState === "all") {
				// Deselect all parts in the group
				newSelectedParts = localSelectedParts.filter(
					(id) => !allPartIds.includes(id),
				);
			} else {
				// Select all parts in the group (add missing ones)
				newSelectedParts = [
					...localSelectedParts,
					...allPartIds.filter((id) => !localSelectedParts.includes(id)),
				];
			}

			setLocalSelectedParts(newSelectedParts);
			onPartsChange(newSelectedParts);
		},
		[
			localSelectedParts,
			onPartsChange,
			collectPartIdsInGroup,
			getGroupSelectionState,
		],
	);

	// Recursive component to render part groups
	const RenderPartGroup = ({
		group,
		path = "",
		level = 0,
	}: {
		group: PartGroup;
		path?: string;
		level?: number;
	}) => {
		const currentPath = path ? `${path}/${group.name}` : group.name;
		const isExpanded = groupsExpanded[currentPath] ?? true;
		const groupSelectionState = getGroupSelectionState(group);

		// Filter logic (keep the same)
		// Filter parts in this group based on search query
		const getFilteredPartsInGroup = (g: PartGroup): string[] => {
			let parts: string[] = [];
			for (const part of g.parts) {
				if ("isGroup" in part && part.isGroup) {
					parts = [...parts, ...getFilteredPartsInGroup(part)];
				} else if ("originalName" in part) {
					parts.push(part.originalName);
				}
			}
			return filterParts(parts);
		};

		const hasVisibleContent = group.parts.some((part) => {
			if ("isGroup" in part && part.isGroup) {
				// Check recursively if subgroup has visible content
				return (
					RenderPartGroup({
						group: part,
						path: currentPath,
						level: level + 1,
					}) !== null
				);
			}
			// Check if the part itself matches the search query
			return (
				!searchQuery ||
				part.originalName.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});

		if (!hasVisibleContent && group.name !== "root") {
			return null; // Don't render the group if no children match the search
		}

		return (
			<div>
				{group.name !== "root" && (
					<div className="flex items-center gap-3 w-full text-left px-3 py-2 h-12 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 mb-3 transition-colors shadow-sm">
						<input
							type="checkbox"
							className="ml-1 flex-shrink-0 custom-checkbox w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors"
							checked={groupSelectionState === "all"}
							ref={(input) => {
								if (input) {
									input.indeterminate = groupSelectionState === "partial";
								}
							}}
							onClick={(e) => e.stopPropagation()}
							onChange={() => handleGroupSelectionToggle(group)}
							title={`Выбрать/Отменить выбор всех в ${group.name}`}
						/>
						<button
							type="button"
							onClick={() => toggleGroupExpansion(currentPath)}
							className="flex items-center gap-3 flex-1 min-w-0 h-full pl-1 pr-2"
						>
							<span className="text-gray-500 flex-shrink-0 hover:text-gray-700 transition-colors">
								{isExpanded ? (
									<IoRemoveOutline size={22} aria-label="Свернуть" />
								) : (
									<IoAddOutline size={22} aria-label="Развернуть" />
								)}
							</span>
							<span
								className="font-medium text-base truncate flex-1 text-gray-800"
								title={group.name}
							>
								{truncateName(group.name)}
							</span>
						</button>
					</div>
				)}

				{isExpanded && (
					<div
						className={`space-y-2 ${
							level > 0 ? "ml-5 border-l-2 border-gray-200 pl-5" : ""
						}`}
					>
						{group.parts.map((part) => {
							if ("isGroup" in part && part.isGroup) {
								const subGroupElement = RenderPartGroup({
									group: part,
									path: currentPath,
									level: level + 1,
								});
								return subGroupElement !== null ? (
									<div key={`group-${currentPath}-${part.name}`}>
										{subGroupElement}
									</div>
								) : null;
							}

							const partDetail = part as PartDetail;

							if (
								searchQuery &&
								!partDetail.originalName
									.toLowerCase()
									.includes(searchQuery.toLowerCase())
							) {
								return null;
							}

							const isSelected = localSelectedParts.includes(
								partDetail.originalName,
							);

							return (
								<label
									key={partDetail.originalName}
									className="flex items-center px-4 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={(e) => {
											handlePartSelection(
												partDetail.originalName,
												e.target.checked,
											);
										}}
										className="w-5 h-5 mr-4 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors"
									/>
									<span className="text-base text-gray-700 group-hover:text-gray-900 transition-colors">
										{truncateName(partDetail.displayName)}
									</span>
								</label>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="h-full flex flex-col">
			{/* Search */}
			<div className="px-5 py-4 sticky top-[0px] bg-white z-10 border-b border-gray-200">
				<div className="relative">
					<IoSearchOutline
						size={22}
						className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск частей..."
						className="w-full pl-12 pr-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-gray-400"
					/>
				</div>
			</div>

			{/* Parts List */}
			<div className="flex-1 overflow-y-auto px-5 py-3">
				{/* Header */}
				<div className="space-y-3">
					<RenderPartGroup group={groupPartsByHierarchy(availableParts)} />
				</div>
			</div>

			{/* Footer */}
			<div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 shadow-lg">
				<div className="flex items-center justify-between">
					<span className="text-base font-medium text-gray-700">
						Выбрано: {localSelectedParts.length}{" "}
					</span>
					<button
						type="button"
						onClick={handleDone}
						className="px-8 py-2.5 bg-red-600 text-white text-base rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md active:transform active:scale-95"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
};

// Update the checkbox styling with larger size and better contrast
const style = document.createElement("style");
style.textContent = `
  .custom-checkbox:indeterminate {
    background-color: rgb(220 38 38);
    border-color: rgb(220 38 38);
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M2 8h12a1 1 0 000-2H2a1 1 0 100 2z'/%3e%3c/svg%3e");
  }
  
  .custom-checkbox:checked {
    background-color: rgb(220 38 38);
    border-color: rgb(220 38 38);
  }
  
  .custom-checkbox:focus {
    box-shadow: 0 0 0 2px rgb(254 202 202);
  }
  
  .custom-checkbox {
    cursor: pointer;
  }
`;
document.head.append(style);

export default PartsSelector;
