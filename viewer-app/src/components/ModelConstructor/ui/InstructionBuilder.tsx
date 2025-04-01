import { useState, useEffect, useCallback } from "react";
import {
	IoLayersOutline,
	IoTrashOutline,
	IoPencilOutline,
	IoAddOutline,
	IoList,
	IoDownloadOutline,
	IoCloseCircleOutline,
	IoEyeOutline,
	IoEyeOffOutline,
	IoReorderThreeOutline,
	IoPlayOutline,
	IoPauseOutline,
	IoPlayBackOutline,
	IoPlayForwardOutline,
	IoRemoveOutline,
} from "react-icons/io5";
import { exportInstructions } from "../utils/exportUtils";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import type {
	DropResult,
	DroppableProvided,
	DraggableProvided,
	DraggableStateSnapshot,
} from "react-beautiful-dnd";
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

interface InstructionBuilderProps {
	instructions: InstructionStep[];
	onInstructionsChange: (instructions: InstructionStep[]) => void;
	onVisibilityChange: (visibleParts: Record<string, boolean>) => void;
	onPartFocus: (partName: string) => void;
	onStepPartsFocus: (stepParts: string[]) => void;
	showToast?: (message: string, type: "success" | "error" | "info") => void;
	highlightEnabled: boolean;
	onHighlightEnabledChange: (enabled: boolean) => void;
	highlightColor: string;
	onHighlightColorChange: (color: string) => void;
	previousStepsTransparency: boolean;
	onPreviousStepsTransparencyChange: (enabled: boolean) => void;
	previousStepsOpacity: number;
	onPreviousStepsOpacityChange: (opacity: number) => void;
	autoRotationEnabled: boolean;
	onAutoRotationChange: (enabled: boolean) => void;
	truncateName: (name: string, maxLength?: number) => string;
	backgroundColor: string;
	onBackgroundColorChange: (color: string) => void;
	availableParts: string[];
	onPartsSelectorOpen?: () => void;
	selectedParts: string[];
	onSelectedPartsChange?: (parts: string[]) => void;
	displayMode: "all" | "selected";
	onDisplayModeChange: (mode: "all" | "selected") => void;
}

const InstructionBuilder: React.FC<InstructionBuilderProps> = ({
	instructions,
	onInstructionsChange,
	onPartFocus,
	onStepPartsFocus,
	showToast,
	availableParts = [],
	onPartsSelectorOpen,
	selectedParts = [],
	onSelectedPartsChange,
	displayMode = "all",
	onDisplayModeChange,
}) => {
	const [editingStep, setEditingStep] = useState<InstructionStep | null>(null);
	const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
	const [newStepForm, setNewStepForm] = useState<{
		name: string;
		description: string;
	}>({
		name: "",
		description: "",
	});
	const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);
	const [previewMode, setPreviewMode] = useState<boolean>(false);
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{},
	);

	// Function to add a new step
	const handleAddStep = () => {
		if (!newStepForm.name || selectedParts.length === 0) {
			showToast?.(
				"Пожалуйста, заполните название шага и выберите детали",
				"error",
			);
			return;
		}

		const newStep: InstructionStep = {
			id: instructions.length + 1,
			name: newStepForm.name,
			description: newStepForm.description,
			parts: selectedParts,
		};

		onInstructionsChange([...instructions, newStep]);
		setNewStepForm({ name: "", description: "" });
		showToast?.("Шаг успешно добавлен", "success");
	};

	// Function to save edited step
	const handleSaveEdit = () => {
		if (!editingStep || !newStepForm.name || selectedParts.length === 0) {
			showToast?.("Пожалуйста, заполните все обязательные поля", "error");
			return;
		}

		const updatedInstructions = instructions.map((step) =>
			step.id === editingStep.id
				? {
						...step,
						name: newStepForm.name,
						description: newStepForm.description,
						parts: selectedParts,
					}
				: step,
		);

		onInstructionsChange(updatedInstructions);
		setEditingStep(null);
		setNewStepForm({ name: "", description: "" });
		showToast?.("Шаг успешно обновлен", "success");
	};

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
		setEditingStep(step);
		setNewStepForm({
			name: step.name,
			description: step.description || "",
		});
		onSelectedPartsChange?.(step.parts);
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

	const handleDisplayModeChange = (mode: "all" | "selected") => {
		onDisplayModeChange?.(mode);
		showToast?.(
			`Режим отображения: ${mode === "all" ? "все детали" : "только выбранные"}`,
			"info",
		);
	};

	const handleExportInstructions = () => {
		exportInstructions(instructions, availableParts, () => {
			showToast?.("Инструкции успешно экспортированы", "success");
		});
	};

	const handleDragEnd = (result: DropResult) => {
		if (!result.destination) return;

		const items = Array.from(instructions);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);

		// Reindex steps
		const reindexedItems = items.map((item, index) => ({
			...item,
			id: index + 1,
		}));

		onInstructionsChange(reindexedItems);
	};

	const handleStepClick = (stepId: number) => {
		const index = instructions.findIndex((step) => step.id === stepId);
		setCurrentStepIndex(index);
		onStepPartsFocus?.(instructions[index].parts);
	};

	const handlePlayPause = () => {
		if (isPlaying) {
			setIsPlaying(false);
		} else {
			setIsPlaying(true);
			if (currentStepIndex === -1) {
				setCurrentStepIndex(0);
				onStepPartsFocus?.(instructions[0].parts);
			}
		}
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
	}, [currentStepIndex, instructions, onStepPartsFocus]);

	// Auto-play effect
	useEffect(() => {
		let interval: ReturnType<typeof setInterval>;
		if (isPlaying && currentStepIndex < instructions.length - 1) {
			interval = setInterval(() => {
				handleNextStep();
			}, 3000);
		}
		return () => clearInterval(interval);
	}, [isPlaying, currentStepIndex, instructions.length, handleNextStep]);

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
		<>
			<div className="h-full flex flex-col bg-white rounded-lg shadow-sm">
				{/* Header Section */}
				<div className="p-4 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => handleDisplayModeChange("all")}
								className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
									displayMode === "all"
										? "bg-red-700 text-white shadow-md hover:bg-red-800"
										: "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
								}`}
							>
								<IoLayersOutline size={16} />
								Все детали
							</button>
							<button
								type="button"
								onClick={() => handleDisplayModeChange("selected")}
								className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
									displayMode === "selected"
										? "bg-red-700 text-white shadow-md hover:bg-red-800"
										: "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
								}`}
							>
								<IoList size={16} />
								Только выбранные
							</button>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPreviewMode(!previewMode)}
								className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
								title={
									previewMode
										? "Отключить предпросмотр"
										: "Включить предпросмотр"
								}
							>
								{previewMode ? (
									<IoEyeOffOutline size={16} />
								) : (
									<IoEyeOutline size={16} />
								)}
							</button>
							<button
								type="button"
								onClick={handleExportInstructions}
								className="px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 shadow-md transition-all duration-200"
								title="Экспортировать инструкции"
							>
								<IoDownloadOutline size={16} />
								Экспорт
							</button>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 flex overflow-hidden">
					{/* Step Form */}
					<div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-sm font-semibold text-gray-800">
									{editingStep ? "Редактировать шаг" : "Добавить новый шаг"}
								</h3>
								<button
									type="button"
									onClick={() => {
										setEditingStep(null);
										setNewStepForm({
											name: "",
											description: "",
										});
									}}
									className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
								>
									<IoCloseCircleOutline size={14} />
									Сбросить
								</button>
							</div>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="step-name"
										className="block text-xs font-medium text-gray-700 mb-1.5"
									>
										Название шага <span className="text-red-500">*</span>
									</label>
									<input
										id="step-name"
										type="text"
										value={newStepForm.name}
										onChange={(e) =>
											setNewStepForm((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
										placeholder="Введите название шага"
									/>
								</div>
								<div>
									<label
										htmlFor="step-description"
										className="block text-xs font-medium text-gray-700 mb-1.5"
									>
										Описание
									</label>
									<textarea
										id="step-description"
										value={newStepForm.description}
										onChange={(e) =>
											setNewStepForm((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
										placeholder="Введите описание шага"
										rows={2}
									/>
								</div>
								<div>
									<button
										type="button"
										onClick={() => onPartsSelectorOpen?.()}
										className="w-full px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 transition-all duration-200"
									>
										<IoList size={16} />
										{selectedParts.length > 0
											? `Выбрано деталей: ${selectedParts.length}`
											: "Выбрать детали"}
									</button>
								</div>
								<button
									type="button"
									onClick={editingStep ? handleSaveEdit : handleAddStep}
									className="w-full px-4 py-2 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 flex items-center justify-center gap-2 shadow-md transition-all duration-200"
								>
									<IoAddOutline size={16} />
									{editingStep ? "Сохранить изменения" : "Добавить шаг"}
								</button>
							</div>
						</div>
					</div>

					{/* Steps List */}
					<div className="flex-1 p-4 overflow-y-auto">
						<div className="flex items-center justify-between mb-4">
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
										onClick={handlePlayPause}
										className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
										title={isPlaying ? "Пауза" : "Воспроизвести"}
									>
										{isPlaying ? (
											<IoPauseOutline size={16} />
										) : (
											<IoPlayOutline size={16} />
										)}
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

						{instructions.length === 0 ? (
							<div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
								<IoList size={24} className="mx-auto mb-2 text-gray-400" />
								<p>Шаги еще не добавлены</p>
							</div>
						) : (
							<DragDropContext onDragEnd={handleDragEnd}>
								<Droppable droppableId="steps">
									{(provided: DroppableProvided) => (
										<div
											{...provided.droppableProps}
											ref={provided.innerRef}
											className="space-y-3"
										>
											{instructions.map((step, index) => (
												<Draggable
													key={step.id}
													draggableId={step.id.toString()}
													index={index}
												>
													{(
														provided: DraggableProvided,
														snapshot: DraggableStateSnapshot,
													) => (
														<div
															ref={provided.innerRef}
															{...provided.draggableProps}
															className={`bg-white rounded-lg border ${
																currentStepIndex === index
																	? "border-red-500 shadow-md"
																	: "border-gray-200"
															} p-4 transition-all duration-200 ${
																snapshot.isDragging ? "shadow-lg" : "shadow-sm"
															}`}
														>
															<div className="flex justify-between items-start">
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-3">
																		<div
																			{...provided.dragHandleProps}
																			className="cursor-grab active:cursor-grabbing"
																		>
																			<IoReorderThreeOutline
																				size={20}
																				className="text-gray-400"
																			/>
																		</div>
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
													)}
												</Draggable>
											))}
											{provided.placeholder}
										</div>
									)}
								</Droppable>
							</DragDropContext>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default InstructionBuilder;
