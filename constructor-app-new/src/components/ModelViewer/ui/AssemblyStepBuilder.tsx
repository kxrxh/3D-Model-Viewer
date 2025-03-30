import { useState, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import {
	IoEyeOutline,
	IoEyeOffOutline,
	IoLayersOutline,
	IoSettingsOutline,
	IoColorPaletteOutline,
	IoColorWandOutline,
	IoRemoveOutline,
	IoAddOutline,
	IoScanOutline,
	IoSaveOutline,
	IoTrashOutline,
	IoCreateOutline,
	IoCheckmarkCircleOutline,
	IoArrowForwardOutline,
	IoArrowBackOutline,
	IoInformationCircleOutline,
	IoHelpCircleOutline,
} from "react-icons/io5";
import { isLightColor } from "../utils";
import type { InstructionStep } from "./StepsList";

// Add new interface for grouped parts
interface PartGroup {
	name: string;
	isGroup: true; // Always true to distinguish from other types
	parts: (PartGroup | PartDetail)[];
	expanded?: boolean;
}

// Add interface for part detail
interface PartDetail {
	originalName: string;
	displayName: string;
	isGroup?: false; // Always false to distinguish from groups
}

// Add toast notification type
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
	const [expanded, setExpanded] = useState(true);
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

	// Instruction States
	const [helpVisible, setHelpVisible] = useState(false);

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
		// Если записи для этого пути нет, считаем группу развернутой по умолчанию
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
					<div className="flex flex-col mb-2">
						<button
							type="button"
							onClick={() => toggleGroupExpansion(currentPath)}
							className="flex items-center gap-3 w-full text-left px-3 py-2 h-10 rounded-lg border border-gray-200 bg-gray-100 hover:bg-gray-200"
						>
							<span className="text-gray-500 flex-shrink-0">
								{isExpanded ? (
									<IoRemoveOutline size={18} aria-label="Collapse" />
								) : (
									<IoAddOutline size={18} aria-label="Expand" />
								)}
							</span>
							<span
								className="font-medium text-sm truncate flex-1"
								title={group.name}
							>
								{truncateName ? truncateName(group.name) : group.name}
							</span>

							{/* Group controls */}
							<div className="flex items-center">
								{/* Selection indicator */}
								{activeTab === "parts" && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											toggleGroupSelection(group, currentPath);
										}}
										className={`mr-2 p-1.5 rounded-full transition-colors ${
											groupSelectionState === "all"
												? "text-blue-600 bg-blue-100"
												: groupSelectionState === "partial"
													? "text-yellow-500 bg-yellow-50"
													: "text-gray-400 hover:bg-gray-200"
										}`}
										title={
											groupSelectionState === "all"
												? "Снять выделение со всех деталей группы"
												: "Выделить все детали в группе"
										}
									>
										<IoCheckmarkCircleOutline size={18} />
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
									className={`ml-1 p-1.5 rounded-full transition-colors ${
										groupVisibilityState === "visible"
											? "text-green-600 hover:bg-green-100"
											: groupVisibilityState === "hidden"
												? "text-gray-500 hover:bg-gray-200"
												: "text-yellow-500 hover:bg-yellow-100"
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
										<IoEyeOutline size={18} />
									) : groupVisibilityState === "hidden" ? (
										<IoEyeOffOutline size={18} />
									) : (
										<IoEyeOutline size={18} className="opacity-50" />
									)}
								</button>
							</div>
						</button>
					</div>
				)}

				{isExpanded && (
					<div
						className={`space-y-2 ${level > 0 ? "ml-3 border-l-2 border-gray-200 pl-3" : ""}`}
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
									className={`flex items-center gap-2 w-full rounded-lg 
										${
											isVisible
												? "bg-green-50 border-green-200 text-green-800"
												: "bg-gray-50 border-gray-200 text-gray-800 opacity-60"
										} border`}
								>
									<div className="flex items-center gap-3 px-3 py-2 h-10 cursor-pointer transition-all text-left flex-1">
										{isVisible ? (
											<button
												type="button"
												onClick={() => togglePartVisibility(originalPartName)}
												className="text-green-600 flex-shrink-0 p-1 rounded-full hover:bg-green-100"
												title="Скрыть деталь"
											>
												<IoEyeOutline size={18} />
											</button>
										) : (
											<button
												type="button"
												onClick={() => togglePartVisibility(originalPartName)}
												className="text-gray-500 flex-shrink-0 p-1 rounded-full hover:bg-gray-100"
												title="Показать деталь"
											>
												<IoEyeOffOutline size={18} />
											</button>
										)}
										<span
											className="text-sm truncate flex-1"
											title={displayName}
										>
											{truncateName ? truncateName(displayName) : displayName}
										</span>

										{activeTab === "parts" && (
											<button
												type="button"
												onClick={() => togglePartSelection(originalPartName)}
												className={`p-1 rounded-full ${
													isSelected
														? "text-blue-600 bg-blue-100 hover:bg-blue-200"
														: "text-gray-400 hover:bg-gray-200"
												}`}
												title={isSelected ? "Убрать из шага" : "Добавить в шаг"}
											>
												<IoCheckmarkCircleOutline size={18} />
											</button>
										)}
									</div>

									{/* Focus button - only show for visible parts */}
									{isVisible && onPartFocus && (
										<button
											type="button"
											onClick={() => onPartFocus(originalPartName)}
											className="px-2 py-2 h-10 text-blue-600 hover:bg-blue-100 rounded-r-lg transition-colors border-l border-green-200"
											title="Зазумиться на деталь"
										>
											<IoScanOutline size={18} />
										</button>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="p-1">
			<div className="flex flex-col mb-5">
				{/* Tabs navigation */}
				<div className="flex border-b border-gray-200 mb-4">
					<button
						type="button"
						className={`py-2 px-4 font-medium text-sm border-b-2 ${
							activeTab === "parts"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => setActiveTab("parts")}
					>
						<div className="flex items-center gap-1.5">
							<IoLayersOutline size={18} />
							Выбор деталей
						</div>
					</button>
					<button
						type="button"
						className={`py-2 px-4 font-medium text-sm border-b-2 ${
							activeTab === "step"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => setActiveTab("step")}
					>
						<div className="flex items-center gap-1.5">
							<IoCreateOutline size={18} />
							Создание шага
						</div>
					</button>

					{/* Spacer */}
					<div className="flex-1" />

					{/* Help button */}
					<button
						type="button"
						className="py-2 px-3 text-gray-500 hover:text-blue-600"
						onClick={() => setHelpVisible(!helpVisible)}
						title="Справка"
					>
						<IoHelpCircleOutline size={20} />
					</button>

					{/* Settings button */}
					<button
						type="button"
						className="py-2 px-3 text-gray-500 hover:text-blue-600"
						onClick={() => setShowSettings(!showSettings)}
						title="Настройки"
					>
						<IoSettingsOutline size={20} />
					</button>
				</div>

				{/* Help panel */}
				{helpVisible && (
					<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<h4 className="font-medium text-sm mb-2 text-blue-800 flex items-center gap-1.5">
							<IoInformationCircleOutline size={18} />
							Справка
						</h4>
						<div className="text-sm text-blue-700 space-y-2">
							<p>
								<strong>Создание шага сборки:</strong>
							</p>
							<ol className="list-decimal pl-5 space-y-1">
								<li>
									На вкладке "Выбор деталей" отметьте детали, которые должны
									войти в шаг
								</li>
								<li>
									Перейдите на вкладку "Создание шага" и заполните название и
									описание
								</li>
								<li>
									Нажмите "Сохранить шаг" для добавления шага в инструкцию
								</li>
							</ol>
							<p className="mt-2">
								<strong>Управление видимостью:</strong>
							</p>
							<ul className="list-disc pl-5 space-y-1">
								<li>Нажмите на 👁️ чтобы скрыть/показать деталь или группу</li>
								<li>Используйте ✓ для выбора деталей для шага</li>
								<li>Используйте 🔍 для фокусировки камеры на детали</li>
							</ul>
						</div>
					</div>
				)}

				{/* Настройки подсветки */}
				{showSettings && (
					<div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
						<h4 className="font-medium text-sm mb-3 text-gray-800 flex items-center gap-1.5">
							<IoColorWandOutline size={18} />
							Настройки отображения
						</h4>

						<div className="space-y-3">
							{/* Включение/отключение подсветки */}
							<div className="flex items-center justify-between">
								<label
									htmlFor="highlight-toggle"
									className="text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer"
								>
									<IoColorPaletteOutline
										size={16}
										className={
											highlightEnabled ? "text-red-600" : "text-gray-500"
										}
									/>
									Подсветка деталей
								</label>
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-medium text-gray-500">
										{highlightEnabled ? "Вкл" : "Выкл"}
									</span>
									<label
										htmlFor="highlight-toggle"
										className="relative inline-block w-10 align-middle select-none cursor-pointer"
									>
										<input
											type="checkbox"
											id="highlight-toggle"
											checked={highlightEnabled}
											onChange={handleHighlightToggle}
											className="sr-only peer"
										/>
										<div className="h-6 w-11 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700 cursor-pointer shadow-inner hover:shadow" />
									</label>
								</div>
							</div>

							{/* Выбор цвета подсветки */}
							{highlightEnabled && (
								<div className="flex items-center gap-3">
									<label
										htmlFor="highlight-color"
										className="text-sm text-gray-700 whitespace-nowrap"
									>
										Цвет:
									</label>
									<div className="flex items-center flex-1 gap-2">
										<input
											type="color"
											id="highlight-color"
											value={highlightColor}
											onChange={handleHighlightColorChange}
											className="h-8 w-8 rounded border-0 cursor-pointer"
										/>
										<div
											className="h-8 px-3 flex-1 rounded flex items-center justify-center text-sm font-medium"
											style={{
												backgroundColor: highlightColor,
												color: isLightColor(highlightColor) ? "#000" : "#fff",
											}}
										>
											{highlightColor}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Active tab content */}
				{activeTab === "parts" ? (
					<>
						{/* Parts selection panel */}
						<div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
							<div className="flex justify-between items-center mb-3">
								<h4 className="text-sm font-medium text-gray-800 flex items-center">
									<IoLayersOutline className="mr-1.5" size={16} />
									Выберите детали для нового шага
								</h4>
								<div className="flex gap-2">
									<button
										type="button"
										className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1.5 transition-colors"
										onClick={() => setActiveTab("step")}
									>
										<IoArrowForwardOutline size={18} />
										<span className="text-sm">Далее</span>
									</button>
								</div>
							</div>

							<div className="text-xs text-gray-500 mb-3">
								{selectedParts.length > 0 ? (
									<>
										Выбрано деталей:{" "}
										<span className="font-medium text-blue-600">
											{selectedParts.length}
										</span>
									</>
								) : (
									<>Нажимайте на ✓ чтобы добавить детали в шаг</>
								)}
							</div>
						</div>
					</>
				) : (
					<>
						{/* Step creation form */}
						<div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
							<div className="flex justify-between items-center mb-3">
								<h4 className="font-medium text-sm text-gray-800 flex items-center gap-1.5">
									<IoCreateOutline size={18} />
									{isEditingStep
										? "Редактирование шага"
										: "Создание нового шага"}
								</h4>
								<button
									type="button"
									className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1.5 transition-colors"
									onClick={() => setActiveTab("parts")}
								>
									<IoArrowBackOutline size={18} />
									<span className="text-sm">Назад</span>
								</button>
							</div>

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
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="Введите описание шага"
										rows={3}
									/>
								</div>

								<div className="bg-blue-50 border border-blue-100 rounded-md p-3">
									<div className="flex items-center gap-2 text-blue-800">
										<IoInformationCircleOutline size={18} />
										<span className="text-sm font-medium">
											Информация о шаге
										</span>
									</div>
									<div className="text-xs text-blue-700 mt-1 space-y-1">
										<p>
											Выбрано деталей:{" "}
											<span className="font-bold">{selectedParts.length}</span>
										</p>
										{selectedParts.length === 0 && (
											<p className="text-red-600">
												Вам нужно выбрать хотя бы одну деталь на вкладке "Выбор
												деталей"
											</p>
										)}
									</div>
								</div>

								<div className="pt-2 flex justify-end gap-2">
									{isEditingStep && (
										<button
											type="button"
											onClick={createNewStep}
											className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
										>
											Отмена
										</button>
									)}
									<button
										type="button"
										onClick={saveCurrentStep}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5"
									>
										<IoSaveOutline size={18} />
										{isEditingStep ? "Обновить шаг" : "Сохранить шаг"}
									</button>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Список деталей */}
				<div className="mb-5">
					<div className="flex justify-between items-center mb-3">
						<h4 className="text-sm font-medium text-gray-600 flex items-center">
							<IoLayersOutline className="mr-1.5" size={16} /> Детали:
						</h4>
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="text-sm text-gray-600 flex items-center hover:text-blue-700 transition-colors"
						>
							{expanded ? "Скрыть детали" : "Показать детали"}
							{expanded ? (
								<IoEyeOffOutline className="ml-2" size={18} />
							) : (
								<IoEyeOutline className="ml-2" size={18} />
							)}
						</button>
					</div>

					{expanded && (
						<div className="max-h-60 overflow-y-auto pr-1 pb-1">
							<RenderPartGroup group={groupPartsByHierarchy(availableParts)} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AssemblyStepBuilder;
