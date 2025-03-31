import { useState, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import {
	IoChevronBackOutline,
	IoChevronForwardOutline,
	IoEyeOutline,
	IoEyeOffOutline,
	IoLayersOutline,
	IoInformationCircleOutline,
	IoCheckmarkCircleOutline,
	IoSettingsOutline,
	IoColorPaletteOutline,
	IoColorWandOutline,
	IoVolumeHighOutline,
	IoVolumeMuteOutline,
	IoRefreshOutline,
	IoRemoveOutline,
	IoAddOutline,
	IoScanOutline,
	IoBrushOutline,
} from "react-icons/io5";
import { isLightColor } from "../utils";

interface InstructionStep {
	id: number;
	name: string;
	parts: string[];
	description?: string;
}

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

interface InstructionViewerProps {
	instructions: InstructionStep[];
	currentStep: number;
	onStepChange: (step: number) => void;
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
}

const InstructionViewer: React.FC<InstructionViewerProps> = ({
	instructions,
	currentStep,
	onStepChange,
	onVisibilityChange,
	onPartFocus,
	onStepPartsFocus,
	showToast,
	highlightEnabled = true,
	onHighlightEnabledChange,
	highlightColor = "#f87171",
	onHighlightColorChange,
	previousStepsTransparency = true,
	onPreviousStepsTransparencyChange,
	previousStepsOpacity = 0.4,
	onPreviousStepsOpacityChange,
	autoRotationEnabled = true,
	onAutoRotationChange,
	truncateName = (name) => name.split("/").pop() || name,
	backgroundColor = "#E2E8F0",
	onBackgroundColorChange,
}) => {
	const [viewMode, setViewMode] = useState<"cumulative" | "isolated">(
		"cumulative",
	);
	const [expanded, setExpanded] = useState(false);
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [showSettings, setShowSettings] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [groupsExpanded, setGroupsExpanded] = useState<Record<string, boolean>>(
		{},
	);

	// Обновляем видимость при изменении шага или режима просмотра
	useEffect(() => {
		if (instructions && instructions.length > 0) {
			const newVisibility = calculateVisibleParts(currentStep, viewMode);
			setVisibleParts(newVisibility);
			onVisibilityChange(newVisibility);
		}
	}, [instructions, currentStep, viewMode, onVisibilityChange]);

	// Прекращаем озвучку при смене шага
	// biome-ignore lint/correctness/useExhaustiveDependencies: We only want to reset speech when step changes
	useEffect(() => {
		if (window.speechSynthesis) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
		}
	}, [currentStep]);

	const handleNextStep = () => {
		if (currentStep < instructions.length) {
			onStepChange(currentStep + 1);
		}
	};

	const handlePrevStep = () => {
		if (currentStep > 0) {
			onStepChange(currentStep - 1);
		}
	};

	// Обновляет видимость деталей в зависимости от текущего шага и режима просмотра
	const calculateVisibleParts = (
		stepIndex: number,
		mode: "cumulative" | "isolated",
	) => {
		const newVisibleParts: Record<string, boolean> = {};

		const allPartNames = new Set<string>();
		for (const step of instructions) {
			for (const part of step.parts) {
				// Handle hierarchical part names (with '/')
				allPartNames.add(part);
			}
		}

		// Шаг 0 показывает полную модель независимо от режима
		if (stepIndex === 0) {
			for (const part of allPartNames) {
				newVisibleParts[part] = true;
			}
		} else {
			// Сначала установим все детали как скрытые
			for (const part of allPartNames) {
				newVisibleParts[part] = false;
			}

			const actualStepIndex = stepIndex - 1;

			if (mode === "cumulative") {
				// Кумулятивный режим: показываем все детали до текущего шага включительно
				for (let i = 0; i <= actualStepIndex; i++) {
					if (instructions[i]?.parts) {
						for (const part of instructions[i].parts) {
							newVisibleParts[part] = true;
						}
					}
				}
			} else {
				// Изолированный режим: показываем только детали текущего шага
				if (instructions[actualStepIndex]?.parts) {
					for (const part of instructions[actualStepIndex].parts) {
						newVisibleParts[part] = true;
					}
				}
			}
		}

		return newVisibleParts;
	};

	const handleViewModeChange = (mode: "cumulative" | "isolated") => {
		setViewMode(mode);
	};

	const togglePartVisibility = useCallback(
		(partName: string) => {
			// Make sure we're working with the original part name as stored in the model
			// For hierarchical parts, this should be the full path
			const newVisibility = {
				...visibleParts,
				[partName]: !visibleParts[partName],
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

	const handlePreviousStepsTransparencyToggle = () => {
		if (onPreviousStepsTransparencyChange) {
			onPreviousStepsTransparencyChange(!previousStepsTransparency);
		}
	};

	const handlePreviousStepsOpacityChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (onPreviousStepsOpacityChange) {
			onPreviousStepsOpacityChange(Number.parseFloat(e.target.value));
		}
	};

	const handleAutoRotationToggle = () => {
		if (onAutoRotationChange) {
			onAutoRotationChange(!autoRotationEnabled);
		}
	};

	const renderStepTitle = () => {
		if (currentStep === 0) {
			return "Полная модель";
		}
		return instructions[currentStep - 1]?.name || "";
	};

	const getCurrentPartCount = () => {
		if (currentStep === 0) {
			const totalParts = new Set<string>();
			for (const step of instructions) {
				for (const part of step.parts) {
					totalParts.add(part);
				}
			}
			return totalParts.size;
		}
		return instructions[currentStep - 1]?.parts.length || 0;
	};

	const getCurrentDescription = () => {
		if (currentStep === 0) {
			return "Просмотр полной модели перед началом сборки";
		}
		return instructions[currentStep - 1]?.description || "";
	};

	// Получение списка деталей для текущего шага
	const getCurrentParts = () => {
		if (currentStep === 0) {
			// Для шага 0 отображаем все уникальные детали
			const allParts = new Set<string>();
			for (const step of instructions) {
				for (const part of step.parts) {
					allParts.add(part);
				}
			}
			return Array.from(allParts);
		}
		return instructions[currentStep - 1]?.parts || [];
	};

	const getProgressPercentage = () => {
		if (currentStep === 0) return 0;
		return Math.min(100, Math.floor((currentStep / instructions.length) * 100));
	};
	// Функция для озвучивания текущего шага
	const speakCurrentStep = () => {
		if (!window.speechSynthesis) {
			console.warn("Браузер не поддерживает Web Speech API");
			return;
		}

		// Остановить текущую озвучку, если воспроизводится
		if (isSpeaking) {
			window.speechSynthesis.cancel();
			setIsSpeaking(false);
			return;
		}

		let textToSpeak = "";

		if (currentStep === 0) {
			textToSpeak = "Просмотр. полной. модели. перед началом сборки";
		} else {
			const stepName = instructions[currentStep - 1]?.name || "";
			const stepDescription = instructions[currentStep - 1]?.description || "";

			// Добавляем паузы и подсказки для улучшения произношения
			textToSpeak = `Шаг ${currentStep} из ${instructions.length}. ${stepName.split(" ").join(". ")}`;

			if (stepDescription) {
				// Разбиваем длинные предложения на фразы с паузами
				const phrases = stepDescription
					.split(/[,.;:]/)
					.filter((phrase) => phrase.trim());
				textToSpeak += `. ${phrases.join(". ")}`;
			}
		}

		// Создаем несколько utterance для разных частей текста
		// для более естественного произношения
		const sentences = textToSpeak.split(". ").filter((s) => s.trim());

		// Очистим очередь речи
		window.speechSynthesis.cancel();

		// Создаем очередь фраз для последовательного произношения
		for (let i = 0; i < sentences.length; i++) {
			const utterance = new SpeechSynthesisUtterance(sentences[i]);
			utterance.lang = "ru-RU";
			utterance.rate = 0.9; // Замедляем немного для лучшего произношения
			utterance.pitch = 1.0;

			// Только для последней фразы устанавливаем обработчик окончания
			if (i === sentences.length - 1) {
				utterance.onend = () => {
					setIsSpeaking(false);
				};

				utterance.onerror = () => {
					setIsSpeaking(false);
				};
			}

			window.speechSynthesis.speak(utterance);
		}

		setIsSpeaking(true);
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
		setGroupsExpanded((prev) => ({
			...prev,
			[path]: !prev[path],
		}));
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
		const groupVisibilityState =
			group.name !== "root"
				? getGroupVisibilityState(group, currentPath)
				: "visible";

		return (
			<div>
				{group.name !== "root" && (
					<button
						type="button"
						onClick={() => toggleGroupExpansion(currentPath)}
						className="flex items-center gap-3 w-full text-left px-3 py-2 h-10 rounded-lg border border-gray-200 bg-gray-100 hover:bg-gray-200 mb-2"
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

						{/* Group visibility toggle */}
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
					</button>
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
									<button
										type="button"
										className="flex items-center gap-3 px-3 py-2 h-10 cursor-pointer transition-all text-left flex-1"
										onClick={() => togglePartVisibility(originalPartName)}
										onKeyDown={(e) => handlePartKeyDown(e, originalPartName)}
									>
										{isVisible ? (
											<IoEyeOutline
												className="text-green-600 flex-shrink-0"
												size={18}
											/>
										) : (
											<IoEyeOffOutline
												className="text-gray-500 flex-shrink-0"
												size={18}
											/>
										)}
										<span
											className="text-sm truncate flex-1"
											title={displayName}
										>
											{truncateName ? truncateName(displayName) : displayName}
										</span>
									</button>

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

	// Simple fallback for showToast if not provided
	const displayToast = useCallback(
		(message: string, type: ToastType = "info") => {
			if (showToast) {
				showToast(message, type);
			} else {
				console.log(`[${type.toUpperCase()}] ${message}`);
			}
		},
		[showToast],
	);

	return (
		<div className="p-1">
			{/* Заголовок и прогресс */}
			<div className="flex flex-col mb-5">
				<div className="flex justify-between items-center mb-3">
					<div className="flex items-center gap-2">
						<span className="text-base font-medium bg-red-100 text-red-800 px-4 py-1.5 rounded-full">
							{currentStep === 0
								? "Обзор"
								: `Шаг ${currentStep}/${instructions.length}`}
						</span>
						<button
							type="button"
							onClick={speakCurrentStep}
							className={`p-2 rounded-full ${
								isSpeaking
									? "bg-red-100 text-red-800"
									: "bg-gray-100 hover:bg-gray-200 text-gray-700"
							} transition-colors`}
							title={isSpeaking ? "Остановить озвучку" : "Озвучить этап"}
						>
							{isSpeaking ? (
								<IoVolumeMuteOutline size={20} />
							) : (
								<IoVolumeHighOutline size={20} />
							)}
						</button>
					</div>
					<button
						type="button"
						onClick={() => setShowSettings(!showSettings)}
						className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1.5 transition-colors"
					>
						<IoSettingsOutline size={18} />
						<span className="text-sm">Настройки</span>
					</button>
				</div>

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

							{/* Включение/отключение прозрачности предыдущих шагов */}
							<div className="flex items-center justify-between">
								<label
									htmlFor="transparency-toggle"
									className="text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer"
								>
									<IoEyeOutline
										size={16}
										className={
											previousStepsTransparency
												? "text-blue-600"
												: "text-gray-500"
										}
									/>
									Прозрачность предыдущих шагов
								</label>
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-medium text-gray-500">
										{previousStepsTransparency ? "Вкл" : "Выкл"}
									</span>
									<label
										htmlFor="transparency-toggle"
										className="relative inline-block w-10 align-middle select-none cursor-pointer"
									>
										<input
											type="checkbox"
											id="transparency-toggle"
											checked={previousStepsTransparency}
											onChange={handlePreviousStepsTransparencyToggle}
											className="sr-only peer"
										/>
										<div className="h-6 w-11 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700 cursor-pointer shadow-inner hover:shadow" />
									</label>
								</div>
							</div>

							{/* Включение/отключение автовращения модели */}
							<div className="flex items-center justify-between">
								<label
									htmlFor="rotation-toggle"
									className="text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer"
								>
									<IoRefreshOutline
										size={16}
										className={
											autoRotationEnabled ? "text-green-600" : "text-gray-500"
										}
									/>
									Автовращение модели
								</label>
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-medium text-gray-500">
										{autoRotationEnabled ? "Вкл" : "Выкл"}
									</span>
									<label
										htmlFor="rotation-toggle"
										className="relative inline-block w-10 align-middle select-none cursor-pointer"
									>
										<input
											type="checkbox"
											id="rotation-toggle"
											checked={autoRotationEnabled}
											onChange={handleAutoRotationToggle}
											className="sr-only peer"
										/>
										<div className="h-6 w-11 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-700 cursor-pointer shadow-inner hover:shadow" />
									</label>
								</div>
							</div>

							{/* Настройка уровня прозрачности */}
							{previousStepsTransparency && (
								<div className="flex items-center gap-3">
									<label
										htmlFor="opacity-slider"
										className="text-sm text-gray-700 whitespace-nowrap"
									>
										Уровень прозрачности:
									</label>
									<div className="flex items-center w-full gap-2">
										<input
											type="range"
											id="opacity-slider"
											min="0.1"
											max="0.9"
											step="0.1"
											value={previousStepsOpacity}
											onChange={handlePreviousStepsOpacityChange}
											className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
										/>
										<span className="text-xs font-medium text-gray-700 min-w-[30px]">
											{Math.round(previousStepsOpacity * 100)}%
										</span>
									</div>
								</div>
							)}

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

							{/* Настройка цвета фона */}
							<div className="flex items-center gap-3">
								<label
									htmlFor="background-color"
									className="text-sm text-gray-700 whitespace-nowrap flex items-center gap-1.5"
								>
									<IoBrushOutline size={16} />
									Цвет фона:
								</label>
								<div className="flex items-center flex-1 gap-2">
									<input
										type="color"
										id="background-color"
										value={backgroundColor}
										onChange={(e) => {
											if (onBackgroundColorChange) {
												onBackgroundColorChange(e.target.value);
											}
										}}
										className="h-8 w-8 rounded border-0 cursor-pointer"
									/>
									<div
										className="h-8 px-3 flex-1 rounded flex items-center justify-center text-sm font-medium"
										style={{
											backgroundColor: backgroundColor,
											color: isLightColor(backgroundColor) ? "#000" : "#fff",
										}}
									>
										{backgroundColor}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Прогресс-бар */}
				<div className="w-full bg-gray-200 rounded-full h-3 mb-2">
					<div
						className="bg-red-700 h-3 rounded-full transition-all duration-500 ease-in-out"
						style={{ width: `${getProgressPercentage()}%` }}
					/>
				</div>

				{/* Название шага */}
				<div className="flex justify-between items-center">
					<h3 className="font-semibold text-lg">{renderStepTitle()}</h3>
					<div className="text-sm text-gray-600 flex items-center gap-2">
						{currentStep > 0 && onPartFocus && (
							<button
								type="button"
								onClick={() => {
									// Focus on all parts in the current step
									const stepParts = instructions[currentStep - 1]?.parts || [];
									if (stepParts.length > 0 && onStepPartsFocus) {
										onStepPartsFocus(stepParts);
									} else if (stepParts.length > 0 && onPartFocus) {
										// Fallback to focusing on first part if onStepPartsFocus not available
										onPartFocus(stepParts[0]);
										displayToast(
											`Фокус на все детали шага ${currentStep}`,
											"info",
										);
									}
								}}
								className="p-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
								title="Зазумиться на все детали шага"
							>
								<IoScanOutline size={18} />
							</button>
						)}
						<div className="flex items-center">
							<IoLayersOutline className="mr-1.5" size={18} />
							{getCurrentPartCount()}{" "}
							{getCurrentPartCount() === 1 ? "деталь" : "деталей"}
						</div>
					</div>
				</div>
			</div>

			{/* Переключатель режима просмотра */}
			{instructions.length > 0 && (
				<div className="flex justify-between items-center mb-5">
					<div className="bg-gray-100 p-1 rounded-lg">
						<button
							type="button"
							onClick={() => handleViewModeChange("cumulative")}
							className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
								viewMode === "cumulative"
									? "bg-red-700 text-white shadow-md"
									: "bg-transparent text-gray-700 hover:bg-gray-200"
							}`}
							disabled={currentStep === 0}
						>
							Накопительно
						</button>
						<button
							type="button"
							onClick={() => handleViewModeChange("isolated")}
							className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
								viewMode === "isolated"
									? "bg-red-700 text-white shadow-md"
									: "bg-transparent text-gray-700 hover:bg-gray-200"
							}`}
							disabled={currentStep === 0}
						>
							Изолированно
						</button>
					</div>

					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="text-sm text-gray-600 flex items-center hover:text-red-700 transition-colors bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200"
					>
						{expanded ? "Скрыть детали" : "Показать детали"}
						{expanded ? (
							<IoEyeOffOutline className="ml-2" size={18} />
						) : (
							<IoEyeOutline className="ml-2" size={18} />
						)}
					</button>
				</div>
			)}

			{/* Описание шага */}
			{getCurrentDescription() && (
				<div className="mb-5 bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-3">
					<IoInformationCircleOutline
						className="text-gray-500 flex-shrink-0 mt-0.5"
						size={20}
					/>
					<div className="text-sm text-gray-700">{getCurrentDescription()}</div>
				</div>
			)}

			{/* Список деталей */}
			{expanded && (
				<div className="mb-5">
					<h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
						<IoLayersOutline className="mr-1.5" size={16} /> Детали в этом шаге:
					</h4>
					<div className="max-h-60 overflow-y-auto pr-1 pb-1">
						<RenderPartGroup group={groupPartsByHierarchy(getCurrentParts())} />
					</div>
				</div>
			)}

			{/* Навигация по шагам */}
			<div className="flex justify-between mt-5">
				<button
					type="button"
					onClick={handlePrevStep}
					disabled={currentStep === 0}
					className={`px-4 py-2.5 rounded-lg flex items-center transition-all text-sm ${
						currentStep === 0
							? "bg-gray-100 text-gray-400 cursor-not-allowed"
							: "bg-gray-200 text-gray-800 hover:bg-gray-300"
					}`}
				>
					<IoChevronBackOutline className="mr-2" size={18} />
					Назад
				</button>

				{currentStep > 0 && currentStep < instructions.length && (
					<div className="hidden sm:flex items-center">
						<span className="mx-2 text-xs font-medium text-gray-500">
							{instructions.map((step) => (
								<span
									key={`step-${step.id}`}
									className={`inline-block w-2.5 h-2.5 mx-0.5 rounded-full ${
										step.id < currentStep
											? "bg-green-500"
											: step.id === currentStep
												? "bg-red-500"
												: "bg-gray-300"
									}`}
								/>
							))}
						</span>
					</div>
				)}

				<button
					type="button"
					onClick={handleNextStep}
					disabled={currentStep === instructions.length}
					className={`px-4 py-2.5 rounded-lg flex items-center transition-all text-sm ${
						currentStep === instructions.length
							? "bg-gray-100 text-gray-400 cursor-not-allowed"
							: "bg-red-700 text-white hover:bg-red-800"
					}`}
				>
					{currentStep === instructions.length ? (
						<>
							<IoCheckmarkCircleOutline className="mr-2" size={18} />
							Завершено
						</>
					) : (
						<>
							Далее
							<IoChevronForwardOutline className="ml-2" size={18} />
						</>
					)}
				</button>
			</div>
		</div>
	);
};

export default InstructionViewer;
