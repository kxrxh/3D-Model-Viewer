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
	IoColorWandOutline
} from "react-icons/io5";

interface InstructionStep {
	id: number;
	name: string;
	parts: string[];
	description?: string;
}

interface InstructionViewerProps {
	instructions: InstructionStep[];
	currentStep: number;
	onStepChange: (step: number) => void;
	onVisibilityChange: (parts: Record<string, boolean>) => void;
	highlightEnabled?: boolean;
	onHighlightEnabledChange?: (enabled: boolean) => void;
	highlightColor?: string;
	onHighlightColorChange?: (color: string) => void;
}

const InstructionViewer: React.FC<InstructionViewerProps> = ({
	instructions,
	currentStep,
	onStepChange,
	onVisibilityChange,
	highlightEnabled = true,
	onHighlightEnabledChange,
	highlightColor = "#f87171",
	onHighlightColorChange
}) => {
	const [viewMode, setViewMode] = useState<"cumulative" | "isolated">("cumulative");
	const [expanded, setExpanded] = useState(false);
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [showSettings, setShowSettings] = useState(false);

	// Обновляем видимость при изменении шага или режима просмотра
	useEffect(() => {
		if (instructions && instructions.length > 0) {
			const newVisibility = calculateVisibleParts(currentStep, viewMode);
			setVisibleParts(newVisibility);
			onVisibilityChange(newVisibility);
		}
	}, [instructions, currentStep, viewMode, onVisibilityChange]);

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
	const calculateVisibleParts = (stepIndex: number, mode: "cumulative" | "isolated") => {
		const newVisibleParts: Record<string, boolean> = {};
		
		const allPartNames = new Set<string>();
		for (const step of instructions) {
			for (const part of step.parts) {
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

	// Обработчик переключения режима просмотра
	const handleViewModeChange = (mode: "cumulative" | "isolated") => {
		setViewMode(mode);
	};

	// Обработчик переключения видимости отдельной детали
	const togglePartVisibility = useCallback((partName: string) => {
		const newVisibility = {
			...visibleParts,
			[partName]: !visibleParts[partName]
		};
		setVisibleParts(newVisibility);
		onVisibilityChange(newVisibility);
	}, [visibleParts, onVisibilityChange]);

	// Обработчик нажатия клавиш для переключения видимости деталей
	const handlePartKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, partName: string) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			togglePartVisibility(partName);
		}
	}, [togglePartVisibility]);

	// Обработчик изменения цвета подсветки
	const handleHighlightColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (onHighlightColorChange) {
			onHighlightColorChange(e.target.value);
		}
	};

	// Обработчик переключения подсветки
	const handleHighlightToggle = () => {
		if (onHighlightEnabledChange) {
			onHighlightEnabledChange(!highlightEnabled);
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

	// Получение прогресса сборки в процентах
	const getProgressPercentage = () => {
		if (currentStep === 0) return 0;
		return Math.min(100, Math.floor((currentStep / instructions.length) * 100));
	};

	// Проверяем, светлый ли цвет подсветки (для контрастного текста)
	const isLightColor = (color: string) => {
		const hex = color.substring(1);
		const r = Number.parseInt(hex.substr(0, 2), 16);
		const g = Number.parseInt(hex.substr(2, 2), 16);
		const b = Number.parseInt(hex.substr(4, 2), 16);
		const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
		return yiq > 128;
	};

	return (
		<div className="p-1">
			{/* Заголовок и прогресс */}
			<div className="flex flex-col mb-5">
				<div className="flex justify-between items-center mb-3">
					<span className="text-base font-medium bg-red-100 text-red-800 px-4 py-1.5 rounded-full">
						{currentStep === 0 ? "Обзор" : `Шаг ${currentStep}/${instructions.length}`}
					</span>
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
							Настройки подсветки
						</h4>
						
						<div className="space-y-3">
							{/* Включение/отключение подсветки */}
							<div className="flex items-center justify-between">
								<label htmlFor="highlight-toggle" className="text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer">
									<IoColorPaletteOutline size={16} className={highlightEnabled ? "text-red-600" : "text-gray-500"} />
									Подсветка деталей
								</label>
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-medium text-gray-500">
										{highlightEnabled ? "Вкл" : "Выкл"}
									</span>
									<label htmlFor="highlight-toggle" className="relative inline-block w-10 align-middle select-none cursor-pointer">
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
									<label htmlFor="highlight-color" className="text-sm text-gray-700 whitespace-nowrap">
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
												color: isLightColor(highlightColor) ? '#000' : '#fff' 
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
					<div className="text-sm text-gray-600 flex items-center">
						<IoLayersOutline className="mr-1.5" size={18} />
						{getCurrentPartCount()} {getCurrentPartCount() === 1 ? 'деталь' : 'деталей'}
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
						{expanded ? <IoEyeOffOutline className="ml-2" size={18} /> : <IoEyeOutline className="ml-2" size={18} />}
					</button>
				</div>
			)}

			{/* Описание шага */}
			{getCurrentDescription() && (
				<div className="mb-5 bg-gray-50 border border-gray-200 rounded-lg p-4 flex gap-3">
					<IoInformationCircleOutline className="text-gray-500 flex-shrink-0 mt-0.5" size={20} />
					<div className="text-sm text-gray-700">{getCurrentDescription()}</div>
				</div>
			)}

			{/* Список деталей */}
			{expanded && (
				<div className="mb-5">
					<h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
						<IoLayersOutline className="mr-1.5" size={16} /> Детали в этом шаге:
					</h4>
					<div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 pb-1">
						{getCurrentParts().map((part) => (
							<button 
								key={part}
								type="button"
								className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all text-left
									${visibleParts[part] 
										? "bg-green-50 border-green-200 text-green-800" 
										: "bg-gray-50 border-gray-200 text-gray-800 opacity-60"}`}
								onClick={() => togglePartVisibility(part)}
								onKeyDown={(e) => handlePartKeyDown(e, part)}
							>
								{visibleParts[part] 
									? <IoEyeOutline className="text-green-600 flex-shrink-0" size={18} /> 
									: <IoEyeOffOutline className="text-gray-500 flex-shrink-0" size={18} />}
								<span className="text-sm truncate flex-1" title={part}>
									{part}
								</span>
							</button>
						))}
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
											? 'bg-green-500' 
											: step.id === currentStep 
												? 'bg-red-500' 
												: 'bg-gray-300'
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
