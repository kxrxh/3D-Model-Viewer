import { useState, useEffect } from "react";
import {
	IoLayersOutline,
	IoTrashOutline,
	IoPencilOutline,
	IoAddOutline,
	IoList,
} from "react-icons/io5";
import PartsSelector from "./PartsSelector";
import { Widget } from "../../common/components";
import {
	DEFAULT_HIGHLIGHT_COLOR,
	DEFAULT_PREVIOUS_STEPS_OPACITY,
	DEFAULT_BACKGROUND_COLOR,
} from "../../common/utils/constants";

interface InstructionStep {
	id: number;
	name: string;
	parts: string[];
	description?: string;
}

type ToastType = "info" | "success" | "error" | "warning";

interface InstructionBuilderProps {
	instructions: InstructionStep[];
	onInstructionsChange: (instructions: InstructionStep[]) => void;
	onVisibilityChange: (parts: Record<string, boolean>) => void;
	onPartFocus?: (partName: string) => void;
	onStepPartsFocus?: (parts: string[]) => void;
	showToast?: (message: string, type: ToastType) => void;
	highlightEnabled?: boolean;
	onHighlightEnabledChange?: (enabled: boolean) => void;
	highlightColor?: string;
	onHighlightColorChange?: (color: string) => void;
	previousStepsTransparency?: boolean;
	onPreviousStepsTransparencyChange?: (enabled: boolean) => void;
	previousStepsOpacity?: number;
	onPreviousStepsOpacityChange?: (opacity: number) => void;
	autoRotationEnabled?: boolean;
	onAutoRotationChange?: (enabled: boolean) => void;
	truncateName?: (name: string, maxLength?: number) => string;
	backgroundColor?: string;
	onBackgroundColorChange?: (color: string) => void;
	availableParts?: string[];
	onPartsSelectorOpen?: () => void;
	selectedParts?: string[];
	onSelectedPartsChange?: (parts: string[]) => void;
	displayMode?: 'all' | 'selected';
	onDisplayModeChange?: (mode: 'all' | 'selected') => void;
}

const InstructionBuilder: React.FC<InstructionBuilderProps> = ({
	instructions,
	onInstructionsChange,
	onVisibilityChange,
	onPartFocus,
	onStepPartsFocus,
	showToast,
	highlightEnabled = true,
	onHighlightEnabledChange,
	highlightColor = DEFAULT_HIGHLIGHT_COLOR,
	onHighlightColorChange,
	previousStepsTransparency = true,
	onPreviousStepsTransparencyChange,
	previousStepsOpacity = DEFAULT_PREVIOUS_STEPS_OPACITY,
	onPreviousStepsOpacityChange,
	autoRotationEnabled = true,
	onAutoRotationChange,
	truncateName = (name) => name.split("/").pop() || name,
	backgroundColor = DEFAULT_BACKGROUND_COLOR,
	onBackgroundColorChange,
	availableParts = [],
	onPartsSelectorOpen,
	selectedParts = [],
	onSelectedPartsChange,
	displayMode = 'all',
	onDisplayModeChange,
}) => {
	const [currentStep, setCurrentStep] = useState<number>(0);
	const [editingStep, setEditingStep] = useState<InstructionStep | null>(null);
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [showPartsSelector, setShowPartsSelector] = useState(false);
	const [newStepForm, setNewStepForm] = useState<{
		name: string;
		description: string;
		selectedParts: string[];
	}>({
		name: "",
		description: "",
		selectedParts: [],
	});

	// Update newStepForm.selectedParts when selectedParts prop changes
	useEffect(() => {
		setNewStepForm((prev) => ({
			...prev,
			selectedParts: selectedParts,
		}));

		// Also notify parent about changes
		onSelectedPartsChange?.(selectedParts);
	}, [selectedParts, onSelectedPartsChange]);

	// Add effect to handle parts selection
	useEffect(() => {
		if (showPartsSelector) {
			onPartsSelectorOpen?.();
		}
	}, [showPartsSelector, onPartsSelectorOpen]);

	// Function to add a new step
	const handleAddStep = () => {
		if (!newStepForm.name || newStepForm.selectedParts.length === 0) {
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
			parts: newStepForm.selectedParts,
		};

		onInstructionsChange([...instructions, newStep]);
		setNewStepForm({ name: "", description: "", selectedParts: [] });
		showToast?.("Шаг успешно добавлен", "success");
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
			selectedParts: step.parts,
		});
	};

	// Function to save edited step
	const handleSaveEdit = () => {
		if (
			!editingStep ||
			!newStepForm.name ||
			newStepForm.selectedParts.length === 0
		) {
			showToast?.("Пожалуйста, заполните все обязательные поля", "error");
			return;
		}

		const updatedInstructions = instructions.map((step) =>
			step.id === editingStep.id
				? {
						...step,
						name: newStepForm.name,
						description: newStepForm.description,
						parts: newStepForm.selectedParts,
					}
				: step,
		);

		onInstructionsChange(updatedInstructions);
		setEditingStep(null);
		setNewStepForm({ name: "", description: "", selectedParts: [] });
		showToast?.("Шаг успешно обновлен", "success");
	};

	// Function to handle parts change
	const handlePartsChange = (parts: string[]) => {
		setNewStepForm((prev) => ({ ...prev, selectedParts: parts }));
		onSelectedPartsChange?.(parts);
	};

	// Function to handle part focus
	const handlePartFocus = (partName: string) => {
		onPartFocus?.(partName);
	};

	// Function to handle step parts focus
	const handleStepPartsFocus = (parts: string[]) => {
		onStepPartsFocus?.(parts);
	};

	// Function to handle visibility change
	const handleVisibilityChange = (parts: Record<string, boolean>) => {
		setVisibleParts(parts);
		onVisibilityChange(parts);
	};

	// Function to handle highlight enabled change
	const handleHighlightEnabledChange = (enabled: boolean) => {
		onHighlightEnabledChange?.(enabled);
		showToast?.(
			`Подсветка деталей ${enabled ? "включена" : "выключена"}`,
			enabled ? "success" : "info",
		);
	};

	// Function to handle highlight color change
	const handleHighlightColorChange = (color: string) => {
		onHighlightColorChange?.(color);
	};

	// Function to handle previous steps transparency change
	const handlePreviousStepsTransparencyChange = (enabled: boolean) => {
		onPreviousStepsTransparencyChange?.(enabled);
		showToast?.(
			`Прозрачность предыдущих шагов ${enabled ? "включена" : "выключена"}`,
			"info",
		);
	};

	// Function to handle previous steps opacity change
	const handlePreviousStepsOpacityChange = (opacity: number) => {
		onPreviousStepsOpacityChange?.(opacity);
	};

	// Function to handle auto rotation change
	const handleAutoRotationChange = (enabled: boolean) => {
		onAutoRotationChange?.(enabled);
		showToast?.(
			`Автовращение модели ${enabled ? "включено" : "выключено"}`,
			"info",
		);
	};

	// Function to handle background color change
	const handleBackgroundColorChange = (color: string) => {
		onBackgroundColorChange?.(color);
	};

	// Function to handle display mode change
	const handleDisplayModeChange = (mode: 'all' | 'selected') => {
		onDisplayModeChange?.(mode);
		showToast?.(
			`Режим отображения: ${mode === 'all' ? 'все детали' : 'только выбранные'}`,
			"info"
		);
	};

	return (
		<>
			<div className="h-full flex flex-col p-2">
				{/* Display Mode Toggle */}
				<div className="flex items-center gap-2 mb-4">
					<button
						type="button"
						onClick={() => handleDisplayModeChange('all')}
						className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-center gap-1 ${
							displayMode === 'all'
								? 'bg-red-700 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						<IoLayersOutline size={14} />
						Все детали
					</button>
					<button
						type="button"
						onClick={() => handleDisplayModeChange('selected')}
						className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-center gap-1 ${
							displayMode === 'selected'
								? 'bg-red-700 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						}`}
					>
						<IoList size={14} />
						Только выбранные
					</button>
				</div>

				{/* Step Form */}
				<div className="bg-gray-50 rounded-lg p-3 mb-4">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-medium text-gray-700">
							{editingStep ? "Редактировать шаг" : "Добавить новый шаг"}
						</h3>
						<button
							type="button"
							onClick={() => {
								setEditingStep(null);
								setNewStepForm({
									name: "",
									description: "",
									selectedParts: [],
								});
							}}
							className="text-xs text-gray-500 hover:text-gray-700"
						>
							Сбросить
						</button>
					</div>
					<div className="space-y-3">
						<div>
							<label
								htmlFor="step-name"
								className="block text-xs font-medium text-gray-700 mb-1"
							>
								Название шага *
							</label>
							<input
								id="step-name"
								type="text"
								value={newStepForm.name}
								onChange={(e) =>
									setNewStepForm((prev) => ({ ...prev, name: e.target.value }))
								}
								className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
								placeholder="Введите название шага"
							/>
						</div>
						<div>
							<label
								htmlFor="step-description"
								className="block text-xs font-medium text-gray-700 mb-1"
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
								className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
								placeholder="Введите описание шага"
								rows={2}
							/>
						</div>
						<div>
							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={() => {
										setShowPartsSelector(true);
										onPartsSelectorOpen?.();
									}}
									className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-1"
								>
									<IoList size={14} />
									Список деталей
								</button>
							</div>
						</div>
						<button
							type="button"
							onClick={editingStep ? handleSaveEdit : handleAddStep}
							className="w-full px-3 py-1.5 text-sm bg-red-700 text-white rounded-md hover:bg-red-800 flex items-center justify-center gap-1"
						>
							<IoAddOutline size={14} />
							{editingStep ? "Сохранить изменения" : "Добавить шаг"}
						</button>
					</div>
				</div>

				{/* Steps List */}
				<div className="flex-1 overflow-y-auto">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-gray-700">
							Шаги инструкции
						</h3>
						<span className="text-xs text-gray-500">
							{instructions.length}{" "}
							{instructions.length === 1
								? "шаг"
								: instructions.length < 5
									? "шага"
									: "шагов"}
						</span>
					</div>
					{instructions.length === 0 ? (
						<div className="text-center py-4 text-sm text-gray-500">
							Шаги еще не добавлены
						</div>
					) : (
						<div className="space-y-2">
							{instructions.map((step) => (
								<div
									key={step.id}
									className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors"
								>
									<div className="flex justify-between items-start">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="text-xs font-medium text-gray-500">
													Шаг {step.id}
												</span>
												<h4 className="text-sm font-medium truncate">
													{step.name}
												</h4>
											</div>
											{step.description && (
												<p className="text-xs text-gray-600 mt-1 line-clamp-2">
													{step.description}
												</p>
											)}
											<div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
												<IoLayersOutline size={12} />
												<span>
													{step.parts.length}{" "}
													{step.parts.length === 1
														? "деталь"
														: step.parts.length < 5
															? "детали"
															: "деталей"}
												</span>
											</div>
										</div>
										<div className="flex gap-1 ml-2">
											<button
												type="button"
												onClick={() => handleEditStep(step)}
												className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
												title="Редактировать шаг"
											>
												<IoPencilOutline size={14} />
											</button>
											<button
												type="button"
												onClick={() => handleDeleteStep(step.id)}
												className="p-1 text-red-600 hover:bg-red-50 rounded-full"
												title="Удалить шаг"
											>
												<IoTrashOutline size={14} />
											</button>
										</div>
									</div>
									<div className="mt-2">
										<div className="flex flex-col gap-1">
											{step.parts.map((part) => {
												const segments = part.split("/");
												const isGroup = segments.length > 1;
												const displayName = isGroup
													? segments.slice(0, -1).join("/")
													: part;
												const partName = isGroup
													? segments[segments.length - 1]
													: part;

												return (
													<div key={part} className="flex flex-col gap-0.5">
														{isGroup && (
															<div className="text-xs text-gray-500 px-1.5">
																{displayName}
															</div>
														)}
														<button
															className="px-1.5 py-0.5 bg-gray-100 rounded text-xs cursor-pointer hover:bg-gray-200 border-0 self-start"
															onClick={() => handlePartFocus(part)}
															type="button"
														>
															{partName}
														</button>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Parts Selector Widget */}
			{showPartsSelector && (
				<Widget
					title="Выберите детали"
					initialPosition={{ x: 520, y: 70 }}
					minWidth={300}
				>
					<PartsSelector
						availableParts={availableParts}
						selectedParts={newStepForm.selectedParts}
						onPartsChange={handlePartsChange}
						onClose={() => setShowPartsSelector(false)}
					/>
				</Widget>
			)}
		</>
	);
};

export default InstructionBuilder;
