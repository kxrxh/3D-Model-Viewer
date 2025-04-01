import { useState, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import {
	IoEyeOutline,
	IoEyeOffOutline,
	IoLayersOutline,
	IoColorPaletteOutline,
	IoRemoveOutline,
	IoAddOutline,
	IoScanOutline,
	IoSaveOutline,
	IoCreateOutline,
	IoCheckmarkCircleOutline,
	IoArrowForwardOutline,
	IoArrowBackOutline,
} from "react-icons/io5";
import type { InstructionStep } from "./StepsList";

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

type ToastType = "info" | "success" | "error" | "warning";

interface AssemblyStepBuilderProps {
	availableParts: string[];
	onVisibilityChange: (parts: Record<string, boolean>) => void;
	onPartFocus?: (partName: string) => void;
	showToast?: (message: string, type: ToastType) => void;
	highlightEnabled?: boolean;
	onHighlightEnabledChange?: (enabled: boolean) => void;
	highlightColor?: string;
	onHighlightColorChange?: (color: string) => void;
	truncateName?: (name: string, maxLength?: number) => string;
	onSaveStep?: (step: Omit<InstructionStep, "id">) => void;
	currentEditingStep?: InstructionStep;
	onCancelEdit?: () => void;
}

const AssemblyStepBuilder: React.FC<AssemblyStepBuilderProps> = ({
	availableParts,
	onVisibilityChange,
	onPartFocus,
	showToast,
	highlightEnabled = true,
	onHighlightEnabledChange,
	highlightColor = "#f87171",
	onHighlightColorChange,
	truncateName = (name) => name.split("/").pop() || name,
	onSaveStep,
	currentEditingStep,
	onCancelEdit,
}) => {
	// UI States
	const [activeTab, setActiveTab] = useState<"parts" | "step">("parts");
	const [showSettings, setShowSettings] = useState(false);
	const [groupsExpanded, setGroupsExpanded] = useState<Record<string, boolean>>(
		{},
	);

	// Step Data States
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [selectedParts, setSelectedParts] = useState<string[]>([]);
	const [stepName, setStepName] = useState("");
	const [stepDescription, setStepDescription] = useState("");
	const [isEditingStep, setIsEditingStep] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Initialize all parts to be visible
	useEffect(() => {
		if (
			availableParts &&
			availableParts.length > 0 &&
			Object.keys(visibleParts).length === 0
		) {
			const initialVisibleParts: Record<string, boolean> = {};
			for (const part of availableParts) {
				initialVisibleParts[part] = true;
			}
			setVisibleParts(initialVisibleParts);
			onVisibilityChange(initialVisibleParts);
		}
	}, [availableParts, onVisibilityChange, visibleParts]);

	// Handle when editing an existing step
	useEffect(() => {
		if (currentEditingStep) {
			setStepName(currentEditingStep.name);
			setStepDescription(currentEditingStep.description || "");
			setIsEditingStep(true);
			setActiveTab("step");

			// Set visible parts and selected parts according to the step
			const newVisibleParts: Record<string, boolean> = {};
			for (const part of availableParts) {
				newVisibleParts[part] = currentEditingStep.parts.includes(part);
			}
			setVisibleParts(newVisibleParts);
			setSelectedParts(currentEditingStep.parts);
			onVisibilityChange(newVisibleParts);
		}
	}, [currentEditingStep, availableParts, onVisibilityChange]);

	// Toggle part selection
	const togglePartSelection = useCallback((partName: string) => {
		setSelectedParts((prev) => {
			if (prev.includes(partName)) {
				return prev.filter((p) => p !== partName);
			}
			return [...prev, partName];
		});
	}, []);

	// Toggle group selection
	const toggleGroupSelection = useCallback(
		(group: PartGroup, path: string) => {
			// Collect all parts in this group
			const collectPartsInGroup = (
				currentGroup: PartGroup,
				currentPath: string,
			): string[] => {
				let partNames: string[] = [];

				for (const part of currentGroup.parts) {
					if ("isGroup" in part && part.isGroup) {
						// It's a subgroup, collect parts recursively
						const subPath = currentPath
							? `${currentPath}/${part.name}`
							: part.name;
						partNames = [...partNames, ...collectPartsInGroup(part, subPath)];
					} else if ("originalName" in part) {
						// It's a part, add its original name
						partNames.push(part.originalName);
					}
				}

				return partNames;
			};

			const groupParts = collectPartsInGroup(group, path);

			// Check if all parts in the group are already selected
			const allSelected = groupParts.every((part) =>
				selectedParts.includes(part),
			);

			if (allSelected) {
				// If all are selected, deselect them all
				setSelectedParts((prev) =>
					prev.filter((part) => !groupParts.includes(part)),
				);
			} else {
				// Otherwise, select all parts that aren't already selected
				setSelectedParts((prev) => {
					const newSelection = [...prev];
					for (const part of groupParts) {
						if (!newSelection.includes(part)) {
							newSelection.push(part);
						}
					}
					return newSelection;
				});
			}
		},
		[selectedParts],
	);

	// Create a new step or update existing step
	const saveCurrentStep = () => {
		if (!stepName.trim()) {
			showToast?.("Имя шага не может быть пустым", "error");
			return;
		}

		if (selectedParts.length === 0) {
			showToast?.("Шаг должен содержать хотя бы одну деталь", "error");
			return;
		}

		if (onSaveStep) {
			onSaveStep({
				name: stepName,
				parts: selectedParts,
				description: stepDescription || undefined,
			});

			showToast?.(
				isEditingStep ? "Шаг обновлен" : "Новый шаг добавлен",
				"success",
			);
		}

		// Reset form
		setStepName("");
		setStepDescription("");
		setSelectedParts([]);
		setIsEditingStep(false);
		setActiveTab("parts");
	};

	// Create a new step with all parts visible
	const createNewStep = () => {
		if (onCancelEdit) {
			onCancelEdit();
		}

		setStepName("");
		setStepDescription("");
		setSelectedParts([]);
		setIsEditingStep(false);
		setActiveTab("parts");

		// Make all parts visible for a new step
		const newVisibleParts: Record<string, boolean> = {};
		for (const part of availableParts) {
			newVisibleParts[part] = true;
		}
		setVisibleParts(newVisibleParts);
		onVisibilityChange(newVisibleParts);
	};

	const togglePartVisibility = useCallback(
		(partName: string) => {
			const newVisibility = {
				...visibleParts,
				[partName]:
					visibleParts[partName] === undefined
						? false
						: !visibleParts[partName],
			};
			setVisibleParts(newVisibility);
			onVisibilityChange(newVisibility);
		},
		[visibleParts, onVisibilityChange],
	);

	const handlePartKeyDown = useCallback(
		(e: KeyboardEvent<HTMLButtonElement>, partName: string) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				togglePartVisibility(partName);
			}
		},
		[togglePartVisibility],
	);

	const handleHighlightColorChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (onHighlightColorChange) {
			onHighlightColorChange(e.target.value);
		}
	};

	const handleHighlightToggle = () => {
		if (onHighlightEnabledChange) {
			onHighlightEnabledChange(!highlightEnabled);
		}
	};

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
				originalName: partName, // Keep the original full name for visibility toggling
				displayName: lastSegment, // The display name is just the last segment
				isGroup: false,
			});
		}

		return root;
	};

	// Toggle group expansion state
	const toggleGroupExpansion = (path: string) => {
		setGroupsExpanded((prev) => {
			// Если значения в словаре еще нет, считаем группу развернутой (true)
			// Первый клик всегда должен свернуть группу
			const currentValue = path in prev ? prev[path] : true;
			return {
				...prev,
				[path]: !currentValue,
			};
		});
	};

	// Toggle visibility for all parts in a group
	const toggleGroupVisibility = useCallback(
		(group: PartGroup, path: string, show: boolean) => {
			const newVisibility = { ...visibleParts };

			// Recursive function to collect all part names in a group and its subgroups
			const collectPartsInGroup = (
				currentGroup: PartGroup,
				currentPath: string,
			): string[] => {
				let partNames: string[] = [];

				for (const part of currentGroup.parts) {
					if ("isGroup" in part && part.isGroup) {
						// It's a subgroup, collect parts recursively
						const subPath = currentPath
							? `${currentPath}/${part.name}`
							: part.name;
						partNames = [...partNames, ...collectPartsInGroup(part, subPath)];
					} else if ("originalName" in part) {
						// It's a part, add its original name
						partNames.push(part.originalName);
					}
				}

				return partNames;
			};

			// Collect all parts in the group
			const allParts = collectPartsInGroup(group, path);

			// Update visibility for all parts
			for (const partName of allParts) {
				newVisibility[partName] = show;
			}

			setVisibleParts(newVisibility);
			onVisibilityChange(newVisibility);
		},
		[visibleParts, onVisibilityChange],
	);

	// Determine if all parts in a group are visible, hidden, or mixed
	const getGroupVisibilityState = useCallback(
		(group: PartGroup, path: string): "visible" | "hidden" | "mixed" => {
			// Recursive function to collect visibility states of all parts
			const collectVisibilityStates = (
				currentGroup: PartGroup,
				currentPath: string,
			): boolean[] => {
				let states: boolean[] = [];

				for (const part of currentGroup.parts) {
					if ("isGroup" in part && part.isGroup) {
						// It's a subgroup, collect states recursively
						const subPath = currentPath
							? `${currentPath}/${part.name}`
							: part.name;
						states = [...states, ...collectVisibilityStates(part, subPath)];
					} else if ("originalName" in part) {
						// It's a part, check its visibility
						const isVisible =
							visibleParts[part.originalName] !== undefined
								? visibleParts[part.originalName]
								: true;
						states.push(isVisible);
					}
				}

				return states;
			};

			const states = collectVisibilityStates(group, path);

			if (states.length === 0) return "visible"; // Default to visible for empty groups

			const visibleCount = states.filter((s) => s).length;

			if (visibleCount === 0) return "hidden";
			if (visibleCount === states.length) return "visible";
			return "mixed";
		},
		[visibleParts],
	);

	// Check if all parts in a group are selected
	const getGroupSelectionState = useCallback(
		(group: PartGroup, path: string): "all" | "none" | "partial" => {
			// Recursive function to collect all part names in a group and its subgroups
			const collectPartsInGroup = (
				currentGroup: PartGroup,
				currentPath: string,
			): string[] => {
				let partNames: string[] = [];

				for (const part of currentGroup.parts) {
					if ("isGroup" in part && part.isGroup) {
						// It's a subgroup, collect parts recursively
						const subPath = currentPath
							? `${currentPath}/${part.name}`
							: part.name;
						partNames = [...partNames, ...collectPartsInGroup(part, subPath)];
					} else if ("originalName" in part) {
						// It's a part, add its original name
						partNames.push(part.originalName);
					}
				}

				return partNames;
			};

			const groupParts = collectPartsInGroup(group, path);

			if (groupParts.length === 0) return "none";

			const selectedCount = groupParts.filter((part) =>
				selectedParts.includes(part),
			).length;

			if (selectedCount === 0) return "none";
			if (selectedCount === groupParts.length) return "all";
			return "partial";
		},
		[selectedParts],
	);

	// Filter parts based on search query
	const filterParts = (group: PartGroup, query: string): PartGroup => {
		if (!query) return group;

		const filteredGroup: PartGroup = {
			...group,
			parts: [],
		};

		for (const part of group.parts) {
			if ("isGroup" in part && part.isGroup) {
				const filteredSubgroup = filterParts(part, query);
				if (filteredSubgroup.parts.length > 0 || part.name.toLowerCase().includes(query.toLowerCase())) {
					filteredGroup.parts.push(filteredSubgroup);
				}
			} else if ("originalName" in part) {
				if (part.originalName.toLowerCase().includes(query.toLowerCase()) ||
					part.displayName.toLowerCase().includes(query.toLowerCase())) {
					filteredGroup.parts.push(part);
				}
			}
		}

		return filteredGroup;
	};

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
		const isExpanded =
			currentPath in groupsExpanded ? groupsExpanded[currentPath] : true;
		const groupVisibilityState =
			group.name !== "root"
				? getGroupVisibilityState(group, currentPath)
				: "visible";

		const groupSelectionState =
			group.name !== "root"
				? getGroupSelectionState(group, currentPath)
				: "none";

		return (
			<div>
				{group.name !== "root" && (
					<div className="flex flex-col mb-1">
						<button
							type="button"
							onClick={() => toggleGroupExpansion(currentPath)}
							className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
						>
							<span className="text-gray-500 flex-shrink-0">
								{isExpanded ? (
									<IoRemoveOutline size={16} aria-label="Collapse" />
								) : (
									<IoAddOutline size={16} aria-label="Expand" />
								)}
							</span>
							<span
								className="font-medium text-sm truncate flex-1"
								title={group.name}
							>
								{truncateName ? truncateName(group.name) : group.name}
							</span>

							{/* Group controls - simplified */}
							<div className="flex items-center gap-1">
								{/* Selection indicator */}
								{activeTab === "parts" && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											toggleGroupSelection(group, currentPath);
										}}
										className={`rounded-md p-1 transition-colors ${
											groupSelectionState === "all"
												? "text-blue-600 bg-blue-50"
												: groupSelectionState === "partial"
													? "text-yellow-500 bg-yellow-50"
													: "text-gray-400 hover:bg-gray-100"
										}`}
										title={
											groupSelectionState === "all"
												? "Снять выделение со всех деталей группы"
												: "Выделить все детали в группе"
										}
									>
										<IoCheckmarkCircleOutline size={16} />
									</button>
								)}

								{/* Visibility toggle */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										toggleGroupVisibility(
											group,
											currentPath,
											groupVisibilityState !== "visible",
										);
									}}
									className={`rounded-md p-1 transition-colors ${
										groupVisibilityState === "visible"
											? "text-green-600"
											: groupVisibilityState === "hidden"
												? "text-gray-500"
												: "text-yellow-500"
									}`}
									title={
										groupVisibilityState === "visible"
											? "Скрыть все детали группы"
											: groupVisibilityState === "hidden"
												? "Показать все детали группы"
												: "Часть деталей скрыта"
									}
								>
									{groupVisibilityState === "visible" ? (
										<IoEyeOutline size={16} />
									) : groupVisibilityState === "hidden" ? (
										<IoEyeOffOutline size={16} />
									) : (
										<IoEyeOutline size={16} className="opacity-50" />
									)}
								</button>
							</div>
						</button>
					</div>
				)}

				{isExpanded && (
					<div
						className={`space-y-1 ${level > 0 ? "ml-4 border-l border-gray-100 pl-2" : ""}`}
					>
						{group.parts.map((part) => {
							// Check if this is a group
							if ("isGroup" in part && part.isGroup) {
								// It's a group, render it recursively
								return (
									<RenderPartGroup
										key={`group-${currentPath}-${part.name}`}
										group={part}
										path={currentPath}
										level={level + 1}
									/>
								);
							}

							// It's a part detail
							const partDetail = part as PartDetail;
							const originalPartName = partDetail.originalName;
							const displayName = partDetail.displayName;

							// Check if part is visible
							const isVisible =
								visibleParts[originalPartName] !== undefined
									? visibleParts[originalPartName]
									: true;

							// Check if part is selected
							const isSelected = selectedParts.includes(originalPartName);

							return (
								<div
									key={`part-${originalPartName}`}
									className={`flex items-center gap-1 w-full rounded-md transition-colors px-2 py-1.5
										${isVisible ? "bg-white" : "bg-gray-50 text-gray-500"}
										${isSelected ? "border-l-2 border-blue-400" : "border-l-2 border-transparent"}
										hover:bg-gray-100`}
								>
									{/* Combined control for selection and visibility */}
									<button
										type="button"
										className="flex items-center gap-2 flex-1 cursor-pointer text-left"
										onClick={() => togglePartSelection(originalPartName)}
										aria-pressed={isSelected}
									>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												togglePartVisibility(originalPartName);
											}}
											className={`flex-shrink-0 p-1 rounded-md transition-colors ${
												isVisible
													? "text-green-600 hover:bg-green-50"
													: "text-gray-400 hover:bg-gray-100"
											}`}
											title={isVisible ? "Скрыть деталь" : "Показать деталь"}
										>
											{isVisible ? (
												<IoEyeOutline size={14} />
											) : (
												<IoEyeOffOutline size={14} />
											)}
										</button>
										
										<span
											className={`text-sm truncate flex-1 ${isSelected ? "font-medium" : ""}`}
											title={originalPartName}
										>
											{truncateName ? truncateName(displayName) : displayName}
										</span>
									</button>

									{/* Compact controls */}
									<div className="flex items-center gap-1">
										{/* Focus button only if part is visible */}
										{isVisible && onPartFocus && (
											<button
												type="button"
												onClick={() => onPartFocus(originalPartName)}
												className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
												title="Зазумиться на деталь"
											>
												<IoScanOutline size={14} />
											</button>
										)}
										
										{/* Selection checkbox - more visually clear */}
										<button
											type="button"
											onClick={() => togglePartSelection(originalPartName)}
											className={`p-1 rounded-md ${
												isSelected
													? "text-blue-600 bg-blue-50"
													: "text-gray-300"
											}`}
											title={isSelected ? "Убрать из шага" : "Добавить в шаг"}
										>
											<IoCheckmarkCircleOutline size={14} />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="p-2">
			{/* Streamlined tabs navigation */}
			<div className="flex border-b border-gray-200 mb-3">
				<button
					type="button"
					className={`py-2 px-3 text-sm border-b-2 ${
						activeTab === "parts"
							? "border-blue-500 text-blue-600 font-medium"
							: "border-transparent text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setActiveTab("parts")}
				>
					<div className="flex items-center gap-1">
						<IoLayersOutline size={16} />
						Детали
					</div>
				</button>
				<button
					type="button"
					className={`py-2 px-3 text-sm border-b-2 ${
						activeTab === "step"
							? "border-blue-500 text-blue-600 font-medium"
							: "border-transparent text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setActiveTab("step")}
				>
					<div className="flex items-center gap-1">
						<IoCreateOutline size={16} />
						Шаг
					</div>
				</button>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Settings button */}
				<button
					type="button"
					className={`py-2 px-3 text-gray-500 hover:text-blue-600 ${showSettings ? 'text-blue-600' : ''}`}
					onClick={() => setShowSettings(!showSettings)}
					title="Настройки подсветки"
				>
					<IoColorPaletteOutline size={16} />
				</button>
			</div>

			{/* Settings panel - simplified */}
			{showSettings && (
				<div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
					<div className="flex items-center gap-3">
						<label htmlFor="highlight-toggle" className="flex items-center text-sm gap-1.5 cursor-pointer">
							<input
								type="checkbox"
								id="highlight-toggle"
								checked={highlightEnabled}
								onChange={handleHighlightToggle}
								className="form-checkbox h-4 w-4 text-red-600 rounded"
							/>
							Подсветка деталей
						</label>
						
						{highlightEnabled && (
							<div className="flex items-center gap-2 ml-auto">
								<label htmlFor="highlight-color" className="text-sm text-gray-700">Цвет:</label>
								<input
									type="color"
									id="highlight-color"
									value={highlightColor}
									onChange={handleHighlightColorChange}
									className="h-6 w-6 rounded border-0 cursor-pointer"
								/>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Active tab content */}
			{activeTab === "parts" ? (
				<>
					{/* Search input */}
					<div className="mb-3">
						<div className="relative">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск деталей..."
								className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							)}
						</div>
					</div>
          
					{/* Selection info and actions bar */}
					<div className="mb-3 flex items-center bg-blue-50 p-2 rounded-lg justify-between">
						<div className="text-sm">
							{selectedParts.length > 0 ? (
								<span className="font-medium text-blue-700">
									Выбрано: {selectedParts.length}
								</span>
							) : (
								<span className="text-gray-500">Выберите детали для шага</span>
							)}
						</div>
						
						<button
							type="button"
							className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1"
							onClick={() => setActiveTab("step")}
							disabled={selectedParts.length === 0}
						>
							<span>Далее</span>
							<IoArrowForwardOutline size={14} />
						</button>
					</div>
				</>
			) : (
				<>
					{/* Step creation form - simplified */}
					<div className="space-y-3">
						<div>
							<label
								htmlFor="step-name"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Название шага:
							</label>
							<input
								type="text"
								id="step-name"
								value={stepName}
								onChange={(e) => setStepName(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
								placeholder="Введите название шага"
							/>
						</div>

						<div>
							<label
								htmlFor="step-description"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Описание (опционально):
							</label>
							<textarea
								id="step-description"
								value={stepDescription}
								onChange={(e) => setStepDescription(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
								placeholder="Введите описание шага"
								rows={2}
							/>
						</div>

						{/* Selection summary */}
						<div className="bg-blue-50 p-2 rounded-md">
							<div className="text-sm text-blue-700">
								Выбрано деталей: <span className="font-bold">{selectedParts.length}</span>
								{selectedParts.length === 0 && (
									<div className="text-red-600 text-xs mt-1">
										Нужно выбрать хотя бы одну деталь
									</div>
								)}
							</div>
						</div>

						<div className="flex justify-between gap-2">
							<button
								type="button"
								onClick={() => setActiveTab("parts")}
								className="px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1"
							>
								<IoArrowBackOutline size={16} />
								<span>Назад</span>
							</button>
							
							<div className="flex gap-2">
								{isEditingStep && (
									<button
										type="button"
										onClick={createNewStep}
										className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Отмена
									</button>
								)}
								<button
									type="button"
									onClick={saveCurrentStep}
									disabled={!stepName.trim() || selectedParts.length === 0}
									className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-blue-600"
								>
									<IoSaveOutline size={16} />
									{isEditingStep ? "Обновить" : "Сохранить"}
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Parts list */}
			{activeTab === "parts" && (
				<div className="mt-3">
					<div className="max-h-80 overflow-y-auto pr-1 pb-1">
						<RenderPartGroup 
							group={filterParts(groupPartsByHierarchy(availableParts), searchQuery)} 
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default AssemblyStepBuilder;
