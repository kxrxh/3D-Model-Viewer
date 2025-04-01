import { useState, useCallback } from "react";
import {
	IoLayersOutline,
	IoTrashOutline,
	IoPencilOutline,
	IoEyeOutline,
	IoPlayBackOutline,
	IoPlayForwardOutline,
	IoAddOutline,
	IoRemoveOutline,
	IoList,
	IoArrowUpOutline,
	IoArrowDownOutline,
} from "react-icons/io5";
import type { InstructionStep } from "../../common/types";

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

interface InstructionStepsProps {
	instructions: InstructionStep[];
	onInstructionsChange: (instructions: InstructionStep[]) => void;
	onPartFocus: (partName: string) => void;
	onStepPartsFocus: (stepParts: string[]) => void;
	showToast?: (message: string, type: "success" | "error" | "info") => void;
	currentStepIndex: number;
	setCurrentStepIndex: (index: number) => void;
	onEditingStepChange: (step: InstructionStep | null) => void;
}

const InstructionSteps: React.FC<InstructionStepsProps> = ({
	instructions,
	onInstructionsChange,
	onPartFocus,
	onStepPartsFocus,
	showToast,
	currentStepIndex,
	setCurrentStepIndex,
	onEditingStepChange,
}) => {
	const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

	// Function to delete a step
	const handleDeleteStep = (stepId: number) => {
		const updatedInstructions = instructions.filter(
			(step) => step.id !== stepId,
		);
		// Reindex remaining steps
		const reindexedInstructions = updatedInstructions.map((step, index) => ({
			...step,
			id: index + 1,
		}));
		onInstructionsChange(reindexedInstructions);
		showToast?.("Шаг успешно удален", "success");
	};

	// Function to start editing a step
	const handleEditStep = (step: InstructionStep) => {
		onEditingStepChange(step);
		const index = instructions.findIndex((s) => s.id === step.id);
		setCurrentStepIndex(index);
		onStepPartsFocus?.(step.parts);
	};

	const handlePartFocus = useCallback(
		(partName: string) => {
			onPartFocus?.(partName);
		},
		[onPartFocus],
	);

	const handleMoveStep = (index: number, direction: 'up' | 'down') => {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		
		if (newIndex < 0 || newIndex >= instructions.length) return;

		const items = Array.from(instructions);
		const [movedItem] = items.splice(index, 1);
		items.splice(newIndex, 0, movedItem);

		// Reindex steps
		const reindexedItems = items.map((item, idx) => ({
			...item,
			id: idx + 1,
		}));

		// Update instructions and current step index
		onInstructionsChange(reindexedItems);
		
		if (currentStepIndex === index) {
			setCurrentStepIndex(newIndex);
		} else if (
			currentStepIndex > index &&
			currentStepIndex <= newIndex
		) {
			setCurrentStepIndex(currentStepIndex - 1);
		} else if (
			currentStepIndex < index &&
			currentStepIndex >= newIndex
		) {
			setCurrentStepIndex(currentStepIndex + 1);
		}

		// Update step parts focus
		onStepPartsFocus?.(reindexedItems[newIndex].parts);
	};

	const handleStepClick = (stepId: number) => {
		const index = instructions.findIndex((step) => step.id === stepId);
		setCurrentStepIndex(index);
		onStepPartsFocus?.(instructions[index].parts);
	};

	const handlePreviousStep = () => {
		if (currentStepIndex > 0) {
			const newIndex = currentStepIndex - 1;
			setCurrentStepIndex(newIndex);
			onStepPartsFocus?.(instructions[newIndex].parts);
		}
	};

	const handleNextStep = useCallback(() => {
		if (currentStepIndex < instructions.length - 1) {
			const newIndex = currentStepIndex + 1;
			setCurrentStepIndex(newIndex);
			onStepPartsFocus?.(instructions[newIndex].parts);
		}
	}, [currentStepIndex, instructions, onStepPartsFocus, setCurrentStepIndex]);

	const toggleStepExpansion = (stepId: number) => {
		setExpandedSteps((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(stepId)) {
				newSet.delete(stepId);
			} else {
				newSet.add(stepId);
			}
			return newSet;
		});
	};

	const toggleGroupExpansion = useCallback((path: string) => {
		setExpandedGroups((prev) => {
			const currentExpandedState = prev[path] ?? false;
			return {
				...prev,
				[path]: !currentExpandedState,
			};
		});
	}, []);

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
				const currentPath = segments.slice(0, i + 1).join("/");
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
						expanded: expandedGroups[currentPath] ?? false,
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

	const RenderPartGroup = ({
		group,
		stepIndex,
		stepId,
		path = "",
		level = 0,
	}: {
		group: PartGroup;
		stepIndex: number;
		stepId: number;
		path?: string;
		level?: number;
	}) => {
		const currentPath = path ? `${path}/${group.name}` : group.name;
		const isExpanded =
			group.name === "root" ? true : (expandedGroups[currentPath] ?? false);

		return (
			<div>
				{group.name !== "root" && (
					<div className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 mb-1.5 transition-colors shadow-sm">
						<button
							type="button"
							onClick={() => toggleGroupExpansion(currentPath)}
							className="flex items-center gap-2 flex-1 min-w-0 h-full"
							aria-expanded={isExpanded}
						>
							<span
								className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${isExpanded ? "rotate-0" : "-rotate-90"} text-gray-400 hover:text-gray-600`}
							>
								{isExpanded ? (
									<IoRemoveOutline size={18} aria-label="Свернуть" />
								) : (
									<IoAddOutline size={18} aria-label="Развернуть" />
								)}
							</span>
							<span
								className="text-sm font-medium truncate text-gray-900"
								title={group.name}
							>
								{group.name}
							</span>
						</button>
					</div>
				)}

				{isExpanded && (
					<div
						className={`space-y-1.5 ${level > 0 ? "ml-5 pl-5 border-l border-gray-200 py-1" : "pt-1"}`}
					>
						{group.parts.map((part) => {
							if ("isGroup" in part && part.isGroup) {
								return (
									<div key={`group-${currentPath}-${part.name}`}>
										{RenderPartGroup({
											group: part,
											stepIndex,
											stepId,
											path: currentPath,
											level: level + 1,
										})}
									</div>
								);
							}

							const partDetail = part as PartDetail;
							const isSelected = currentStepIndex === stepIndex;

							return (
								<button
									key={partDetail.originalName}
									type="button"
									className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 ${
										isSelected
											? "bg-red-50 text-red-700 hover:bg-red-100"
											: "bg-gray-50 text-gray-700 hover:bg-gray-100"
									}`}
									onClick={() => handlePartFocus(partDetail.originalName)}
								>
									{partDetail.displayName}
								</button>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="h-full flex flex-col bg-white rounded-lg shadow-sm">
			{/* Header Section */}
			<div className="sticky top-0 z-10 bg-white border-b border-gray-200">
				<div className="p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-800">
							Шаги инструкции
						</h3>
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
								{instructions.length}{" "}
								{instructions.length === 1
									? "шаг"
									: instructions.length < 5
										? "шага"
										: "шагов"}
							</span>
							<div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
								<button
									type="button"
									onClick={handlePreviousStep}
									disabled={currentStepIndex <= 0}
									className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									title="Предыдущий шаг"
								>
									<IoPlayBackOutline size={16} />
								</button>
								<button
									type="button"
									onClick={handleNextStep}
									disabled={currentStepIndex >= instructions.length - 1}
									className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									title="Следующий шаг"
								>
									<IoPlayForwardOutline size={16} />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Steps List */}
			<div className="flex-1 p-4 overflow-y-auto">
				{instructions.length === 0 ? (
					<div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
						<IoList size={24} className="mx-auto mb-2 text-gray-400" />
						<p>Шаги еще не добавлены</p>
					</div>
				) : (
					<div className="space-y-3">
						{instructions.map((step, index) => (
							<div
								key={step.id}
								className={`bg-white rounded-lg border ${
									currentStepIndex === index
										? "border-red-500 shadow-md"
										: "border-gray-200"
								} p-4 transition-all duration-200 shadow-sm`}
							>
								<div className="flex justify-between items-start">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3">
											<span
												className={`text-xs font-medium px-2 py-1 rounded-full ${
													currentStepIndex === index
														? "bg-red-100 text-red-700"
														: "bg-gray-100 text-gray-700"
												}`}
											>
												Шаг {step.id}
											</span>
											<h4 className="text-sm font-medium truncate">
												{step.name}
											</h4>
										</div>
										{step.description && (
											<p className="text-xs text-gray-600 mt-2 line-clamp-2">
												{step.description}
											</p>
										)}
										<div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
											<IoLayersOutline size={14} />
											<span>
												{step.parts.length}{" "}
												{step.parts.length === 1
													? "деталь"
													: step.parts.length < 5
														? "детали"
														: "деталей"}
											</span>
											<button
												type="button"
												onClick={() =>
													toggleStepExpansion(step.id)
												}
												className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
											>
												{expandedSteps.has(step.id)
													? "Скрыть"
													: "Показать"}
											</button>
										</div>
									</div>
									<div className="flex gap-2 ml-4">
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleStepClick(step.id)}
												className={`p-2 rounded-lg transition-colors duration-200 ${
													currentStepIndex === index
														? "bg-red-50 text-red-600"
														: "text-blue-600 hover:bg-blue-50"
												}`}
												title="Показать детали"
											>
												<IoEyeOutline size={16} />
											</button>
											<button
												type="button"
												onClick={() => handleEditStep(step)}
												className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
												title="Редактировать шаг"
											>
												<IoPencilOutline size={16} />
											</button>
											<button
												type="button"
												onClick={() => handleDeleteStep(step.id)}
												className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
												title="Удалить шаг"
											>
												<IoTrashOutline size={16} />
											</button>
										</div>
										<div className="flex flex-col gap-1 ml-2 border-l border-gray-200 pl-2">
											<button
												type="button"
												onClick={() => handleMoveStep(index, 'up')}
												disabled={index === 0}
												className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												title="Переместить вверх"
											>
												<IoArrowUpOutline size={16} />
											</button>
											<button
												type="button"
												onClick={() => handleMoveStep(index, 'down')}
												disabled={index === instructions.length - 1}
												className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												title="Переместить вниз"
											>
												<IoArrowDownOutline size={16} />
											</button>
										</div>
									</div>
								</div>
								{expandedSteps.has(step.id) && (
									<div className="mt-3 border-t border-gray-100 pt-3">
										<RenderPartGroup
											group={groupPartsByHierarchy(step.parts)}
											stepIndex={index}
											stepId={step.id}
										/>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default InstructionSteps; 