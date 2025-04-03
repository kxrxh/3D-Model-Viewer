import { useState, useCallback, useEffect, useRef } from "react";
import {
	IoAddOutline,
	IoList,
	IoDownloadOutline,
	IoCloseCircleOutline,
	IoRemoveOutline,
	IoCloudUploadOutline,
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

// Define a type for the expected structure of the imported JSON
interface SubAssemblyImport {
	steps: Omit<InstructionStep, "id">[]; // Steps without IDs, as they will be reassigned
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
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{},
	);
	const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

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
			// Don't automatically clear selection when editing stops
			// The form reset is handled elsewhere (e.g., after import, after add/save)
			// setNewStepForm({
			// 	name: "",
			// 	description: "",
			// });
			// onSelectedPartsChange?.([]); // <-- REMOVE THIS LINE
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
			showToast?.(
				`Ошибка при экспорте: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
				"error",
			);
		}
	};

	// Function to handle sub-assembly import
	const handleImportSubAssembly = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) {
			showToast?.("Файл не выбран", "error");
			return;
		}

		// Store the selection state *before* the import starts
		const initialSelectedParts = [...selectedParts];

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				if (!content) {
					throw new Error("Не удалось прочитать файл");
				}
				const importedData: unknown = JSON.parse(content);

				// Basic validation - Check for 'assemblyStages' instead of 'steps'
				if (
					typeof importedData !== "object" ||
					importedData === null ||
					!Array.isArray((importedData as { assemblyStages?: unknown }).assemblyStages) // Check for assemblyStages
				) {
					throw new Error(
						"Неверный формат файла. Ожидается JSON объект с полем 'assemblyStages' (массив).", // Updated error message
					);
				}

				// Use 'assemblyStages' for extraction
				const { assemblyStages: importedSteps } = importedData as { assemblyStages: Omit<InstructionStep, 'id'>[] };

				if (importedSteps.length === 0) {
					showToast?.("Импортированный файл не содержит шагов", "info");
					return;
				}

				// 2. Process imported steps, map parts, and collect warnings
				const remappedSteps: Omit<InstructionStep, 'id'>[] = [];
				const missingParts = new Set<string>();

				// Keep track of imported names that don't match any selected part
				const unmatchedImportedNames = new Set<string>();

				// Keep track of which initially selected parts are used by *any* imported step
				const usedSelectedParts = new Set<string>();

				for (const step of importedSteps) {
					const stepMappedParts = new Set<string>();

					for (const importedPartName of step.parts) {
						const cleanImportedName = importedPartName.trim();
						// Get the base name of the imported part - we use this for suffix checking
						const importedBaseName = (cleanImportedName.split('/').pop() || cleanImportedName).trim();
						let foundMatchForThisImportedName = false;

						for (const availablePartFullName of availableParts) {
							const cleanAvailableFullName = availablePartFullName.trim();
							const segments = cleanAvailableFullName.split('/').map(s => s.trim());

							// --- Check if ANY segment matches importedBaseName + suffix ---
							let segmentMatchFound = false;
							for (const segment of segments) {
								if (segment.startsWith(importedBaseName)) {
									const suffix = segment.substring(importedBaseName.length);
									const isValidSuffix = suffix === '' || /^(_\d+)$/.test(suffix);
									if (isValidSuffix) {
										// We found a segment in the selected part that matches the imported base + suffix
										segmentMatchFound = true;
										break; // Stop checking segments for this availablePart
									}
								}
							}
							// --- End Segment Check ---

							if (segmentMatchFound) {
								// Log exactly what is being added
								// console.log(`[Import] ===> Attempting to add to usedSelectedParts: '${availablePartFullName}'`); // <-- REMOVE LOG
								usedSelectedParts.add(availablePartFullName);
								stepMappedParts.add(availablePartFullName);
								foundMatchForThisImportedName = true;
								// Continue checking other available parts for this imported name
							}
						}

						if (!foundMatchForThisImportedName) {
							console.warn(`[Import] No selected part found containing a segment matching base '${importedBaseName}' (from: ${cleanImportedName})`);
							missingParts.add(importedBaseName);
							// Add the original imported name (that failed to match) to the unmatched set
							unmatchedImportedNames.add(cleanImportedName);
						}
					}

					// Final check for the step
					const finalPartsArray = Array.from(stepMappedParts);

					if (finalPartsArray.length > 0) {
						remappedSteps.push({ ...step, parts: finalPartsArray });
					} else {
						console.warn(`[Import] Step '${step.name}' skipped (no selected parts matched). Imported names: ${step.parts.join(', ')}`);
					}
				}

				// --- End: Enhanced Part Matching Logic ---

				// Calculate which of the initially selected parts were NOT used by the import
				console.log("[Import] Populated usedSelectedParts Set:", usedSelectedParts);
				const unusedSelectedParts = initialSelectedParts.filter(part => !usedSelectedParts.has(part));
				console.log("[Import] Filter result (unusedSelectedParts Array):", unusedSelectedParts);

				// Update the main selection to only contain the unused parts
				if (onSelectedPartsChange) {
					console.log("[Import] Populated usedSelectedParts Set:", usedSelectedParts);
					const unusedSelectedParts = initialSelectedParts.filter(part => !usedSelectedParts.has(part));
					console.log("[Import] Filter result (unusedSelectedParts Array):", unusedSelectedParts);

					// Delay this update slightly to ensure it happens after potential resets from onInstructionsChange
					setTimeout(() => {
						console.log("[Import] Calling onSelectedPartsChange with unused parts (delayed)...");
						onSelectedPartsChange(unusedSelectedParts);
					}, 0);
				}

				// Add the new steps with their mapped parts to the instructions
				const maxId = instructions.reduce(
					(max, step) => Math.max(max, step.id),
					0,
				);
				const newSteps = remappedSteps.map((step, index) => ({
					...step,
					id: maxId + index + 1,
					// Ensure description is at least an empty string if missing
					description: step.description || "",
				}));

				if (newSteps.length > 0) {
					onInstructionsChange([...instructions, ...newSteps]);
				}

				// Clear the new step form after import
				setNewStepForm({ name: "", description: "" });

				// Construct final feedback message
				let feedbackMessage = `Подсборка импортирована: ${newSteps.length} шагов добавлено.`;
				let feedbackType: "success" | "error" | "info" = "success";

				if (missingParts.size > 0) {
					feedbackMessage += " Предупреждения:";
					feedbackType = "error"; // Use 'error' for higher visibility on warnings
					if (missingParts.size > 0) {
						feedbackMessage += ` ${missingParts.size} импортированных базовых имен не найдены ни в одном сегменте ВЫБРАННЫХ деталей (${[...missingParts].slice(0, 3).join(', ')}${missingParts.size > 3 ? '...' : ''}).`; // Adjusted message
					}
					if (unusedSelectedParts.length < initialSelectedParts.length) {
						const usedCount = initialSelectedParts.length - unusedSelectedParts.length;
						feedbackMessage += ` ${usedCount} деталей из исходного выделения были использованы в импортированных шагах.`;
					}
					if (unusedSelectedParts.length > 0 && usedSelectedParts.size > 0) {
						feedbackMessage += ` ${unusedSelectedParts.length} деталей остались выделенными.`;
					}
					feedbackMessage += " Проверьте консоль для деталей.";
				}

				showToast?.(feedbackMessage, feedbackType);

			} catch (error) {
				console.error("Ошибка импорта подсборки:", error);
				showToast?.(
					`Ошибка импорта: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
					"error",
				);
			} finally {
				// Reset file input to allow importing the same file again
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}
		};

		reader.onerror = () => {
			showToast?.("Ошибка при чтении файла", "error");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		};

		reader.readAsText(file);
	};

	// Trigger hidden file input click
	const triggerFileInput = () => {
		fileInputRef.current?.click();
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
								<span className="text-xs font-medium text-gray-500">
									Режим:
								</span>
								<button
									type="button"
									onClick={() =>
										handleDisplayModeChange(
											displayMode === "all" ? "selected" : "all",
										)
									}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
										displayMode === "selected" ? "bg-red-600" : "bg-gray-200"
									}`}
									title={
										displayMode === "all"
											? "Показать изолированные детали"
											: "Показать все детали"
									}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
											displayMode === "selected"
												? "translate-x-6"
												: "translate-x-1"
										}`}
									/>
								</button>
								<span className="text-xs font-medium text-gray-700">
									{displayMode === "all"
										? "Все детали"
										: "Изолированные детали"}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{/* Existing Export Button */}
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

				{/* Hidden File Input */}
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleImportSubAssembly}
					accept=".json"
					style={{ display: "none" }}
					aria-hidden="true"
					tabIndex={-1}
				/>

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
									disabled={!newStepForm.name || selectedParts.length === 0}
									className="w-full px-4 py-2 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 flex items-center justify-center gap-2 shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<IoAddOutline size={16} />
									{editingStep ? "Сохранить изменения" : "Добавить шаг"}
								</button>
								{/* Moved Import Button */}
								<button
									type="button"
									onClick={triggerFileInput}
									disabled={selectedParts.length === 0}
									className="w-full px-4 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									title={selectedParts.length === 0 ? "Выберите детали для импорта шагов в них" : "Импортировать подсборку из файла JSON"}
								>
									<IoCloudUploadOutline size={16} />
									Импорт шагов
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
