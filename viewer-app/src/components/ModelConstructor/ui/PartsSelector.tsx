import { useState, useCallback, useEffect } from "react";
import {
	IoSearchOutline,
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
	isEditing?: boolean;
	partsUsedInSteps?: string[];
}

const PartsSelector: React.FC<PartsSelectorProps> = ({
	availableParts,
	selectedParts,
	onPartsChange,
	onClose,
	isEditing = false,
	partsUsedInSteps = [],
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
							groupsExpanded[segments.slice(0, i + 1).join("/")] ?? false,
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
		if (!isEditing && selectedParts.includes(partName)) {
			return;
		}

		const newSelectedParts = isSelected
			? [...localSelectedParts, partName]
			: localSelectedParts.filter((p) => p !== partName);
		setLocalSelectedParts(newSelectedParts);
		onPartsChange(newSelectedParts);
	};

	// Handle group selection
	const handleGroupSelectionToggle = useCallback(
		(group: PartGroup) => {
			const allPartIds = collectPartIdsInGroup(group);
			const groupState = getGroupSelectionState(group);

			if (!isEditing && groupState === "all") {
				return;
			}

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
			isEditing,
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
		const isExpanded = group.name === "root" ? true : (groupsExpanded[currentPath] ?? false);
		const groupSelectionState = getGroupSelectionState(group);

		// Check if group has any parts used in other steps
		const hasUsedParts = group.parts.some(part => {
			if ("isGroup" in part && part.isGroup) {
				return collectPartIdsInGroup(part).some(id => partsUsedInSteps.includes(id));
			}
			return partsUsedInSteps.includes(part.originalName);
		});

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
			return null;
		}

		return (
			<div>
				{group.name !== "root" && (
					<div className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border ${
						hasUsedParts
							? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
							: groupSelectionState === "all"
								? 'border-red-200 bg-red-50 hover:bg-red-100'
								: 'border-gray-200 bg-white hover:bg-gray-50'
					} mb-1.5 transition-colors shadow-sm`}>
						<input
							type="checkbox"
							className={`w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors ${
								hasUsedParts ? 'opacity-50 cursor-not-allowed' : ''
							}`}
							checked={hasUsedParts || groupSelectionState === "all"}
							disabled={hasUsedParts}
							ref={(input) => {
								if (input) {
									input.indeterminate = !hasUsedParts && groupSelectionState === "partial";
								}
							}}
							onClick={(e) => e.stopPropagation()}
							onChange={() => !hasUsedParts && handleGroupSelectionToggle(group)}
							title={group.name}
						/>
						<button
							type="button"
							onClick={() => toggleGroupExpansion(currentPath)}
							className="flex items-center gap-2 flex-1 min-w-0 h-full"
							aria-expanded={isExpanded}
						>
							<span className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-0' : '-rotate-90'} ${
								hasUsedParts
									? 'text-blue-400 hover:text-blue-600'
									: groupSelectionState === "all"
										? 'text-red-400 hover:text-red-600'
										: 'text-gray-400 hover:text-gray-600'
							}`}>
								{isExpanded ? (
									<IoRemoveOutline size={18} aria-label="Свернуть" />
								) : (
									<IoAddOutline size={18} aria-label="Развернуть" />
								)}
							</span>
							<span
								className={`text-sm font-medium truncate flex-1 ${
									hasUsedParts
										? 'text-blue-700'
										: groupSelectionState === "all"
											? 'text-red-700'
											: 'text-gray-900'
								}`}
								title={group.name}
							>
								{group.name}
							</span>
						</button>
					</div>
				)}

				{isExpanded && (
					<div
						className={`space-y-1.5 ${
							level > 0 ? "ml-5 pl-5 border-l border-gray-200 py-1" : "pt-1"
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
							const matchesSearch = !searchQuery || partDetail.originalName.toLowerCase().includes(searchQuery.toLowerCase());
							if (!matchesSearch) {
								return null;
							}

							const isSelected = localSelectedParts.includes(
								partDetail.originalName,
							);
							const isUsedInOtherSteps = partsUsedInSteps.includes(partDetail.originalName);

							return (
								<label
									key={partDetail.originalName}
									className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
										isUsedInOtherSteps
											? 'bg-blue-50/90 hover:bg-blue-100/90 border border-blue-100'
											: isSelected
												? 'bg-red-50/90 hover:bg-red-100/90 border border-red-100'
												: 'hover:bg-gray-100 border border-transparent'
									}`}
								>
									<input
										type="checkbox"
										checked={isUsedInOtherSteps || isSelected}
										disabled={isUsedInOtherSteps}
										onChange={(e) => {
											if (!isUsedInOtherSteps) {
												handlePartSelection(
													partDetail.originalName,
													e.target.checked,
												);
											}
										}}
										className={`w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors ${
											isUsedInOtherSteps ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									/>
									<div className="flex-1 min-w-0 w-full">
										<div className="flex flex-col min-w-0">
											<span 
												className={`text-sm transition-colors truncate ${
													isUsedInOtherSteps
														? 'text-blue-700 group-hover:text-blue-800'
														: isSelected
															? 'text-red-700 group-hover:text-red-800'
															: 'text-gray-700 group-hover:text-gray-900'
												}`}
												title={partDetail.displayName}
											>
												{partDetail.displayName}
											</span>
											{isUsedInOtherSteps && (
												<span className="text-xs text-blue-500/90 block mt-0.5">
													Используется в других шагах
												</span>
											)}
										</div>
									</div>
								</label>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="h-full flex flex-col bg-gray-50">
			{/* Search and Actions */}
			<div className="sticky top-0 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
				<div className="relative mb-3">
					<IoSearchOutline
						size={20}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск частей..."
						className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all placeholder:text-gray-400"
					/>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => {
							// Filter out parts that are used in other steps
							const availablePartsToSelect = availableParts.filter(
								part => !partsUsedInSteps.includes(part)
							);
							onPartsChange(availablePartsToSelect);
						}}
						className="text-sm py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
						disabled={!isEditing}
					>
						Выбрать все
					</button>
					<button
						type="button"
						onClick={() => onPartsChange([])}
						className="text-sm py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
						disabled={!isEditing}
					>
						Снять выбор
					</button>
				</div>
			</div>

			{/* Parts List */}
			<div className="flex-1 overflow-y-auto px-4 py-3">
				<div className="space-y-2">
					<RenderPartGroup group={groupPartsByHierarchy(availableParts)} />
				</div>
			</div>

			{/* Footer */}
			<div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 z-10">
				<button
					type="button"
					onClick={onClose}
					className="w-full px-8 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
				>
					Закрыть
				</button>
			</div>
		</div>
	);
};

export default PartsSelector;
