import { useState, useCallback, useEffect } from "react";
import {
	IoAddOutline,
	IoList,
	IoDownloadOutline,
	IoCloseCircleOutline,
	IoRemoveOutline,
} from "react-icons/io5";
import { exportInstructions } from "../utils/exportUtils";
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
	modelUrl: string | null;
	editingStep: InstructionStep | null;
	onEditingStepChange: (step: InstructionStep | null) => void;
}

const InstructionBuilder: React.FC<InstructionBuilderProps> = ({
	instructions,
	onInstructionsChange,
	onPartFocus,
	showToast,
	availableParts = [],
	onPartsSelectorOpen,
	selectedParts = [],
	onSelectedPartsChange,
	displayMode = "all",
	onDisplayModeChange,
	modelUrl,
	editingStep,
	onEditingStepChange,
}) => {
	const [newStepForm, setNewStepForm] = useState<{
		name: string;
		description: string;
	}>({
		name: "",
		description: "",
	});
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

	// Update form when editingStep changes
	useEffect(() => {
		if (editingStep) {
			setNewStepForm({
				name: editingStep.name,
				description: editingStep.description || "",
			});
			// Update selected parts when editing a step
			onSelectedPartsChange?.(editingStep.parts);
		} else {
			setNewStepForm({
				name: "",
				description: "",
			});
			// Clear selected parts when not editing
			onSelectedPartsChange?.([]);
		}
	}, [editingStep, onSelectedPartsChange]);

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
		onEditingStepChange(null);
		setNewStepForm({ name: "", description: "" });
		showToast?.("Шаг успешно обновлен", "success");
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
			`Режим отображения: ${mode === "all" ? "все детали" : "изолированные детали"}`,
			"info",
		);
	};

	const handleExportInstructions = async () => {
		try {
			await exportInstructions(instructions, availableParts, modelUrl, () => {
				showToast?.("Инструкции и модель успешно экспортированы", "success");
			});
		} catch (error) {
			showToast?.(`Ошибка при экспорте: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`, "error");
		}
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

							return (
								<button
									key={partDetail.originalName}
									type="button"
									className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 ${
										selectedParts.includes(partDetail.originalName)
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
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-gray-500">Режим:</span>
								<button
									type="button"
									onClick={() => handleDisplayModeChange(displayMode === "all" ? "selected" : "all")}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
										displayMode === "selected" ? "bg-red-600" : "bg-gray-200"
									}`}
									title={displayMode === "all" ? "Показать изолированные детали" : "Показать все детали"}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
											displayMode === "selected" ? "translate-x-6" : "translate-x-1"
										}`}
									/>
								</button>
								<span className="text-xs font-medium text-gray-700">
									{displayMode === "all" ? "Все детали" : "Изолированные детали"}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleExportInstructions}
								className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center gap-2"
								title="Экспортировать инструкции"
							>
								<IoDownloadOutline size={16} />
								<span className="text-sm font-medium">Экспорт</span>
							</button>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Step Form */}
					<div className="p-4 border-b border-gray-200">
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-sm font-semibold text-gray-800">
									{editingStep ? "Редактировать шаг" : "Добавить новый шаг"}
								</h3>
								<button
									type="button"
									onClick={() => {
										onEditingStepChange(null);
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
				</div>
			</div>
		</>
	);
};

export default InstructionBuilder;
