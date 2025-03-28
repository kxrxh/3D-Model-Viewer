import { useState, useEffect } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";

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
}

const InstructionViewer: React.FC<InstructionViewerProps> = ({
	instructions,
	currentStep,
	onStepChange,
	onVisibilityChange,
}) => {
	const [viewMode, setViewMode] = useState<"cumulative" | "isolated">(
		"cumulative",
	);

	// Обновляем видимость при изменении шага или режима просмотра
	useEffect(() => {
		if (instructions && instructions.length > 0) {
			updateVisibleParts(currentStep, viewMode);
		}
	}, [instructions, currentStep, viewMode]);

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
	const updateVisibleParts = (stepIndex: number, mode: "cumulative" | "isolated") => {
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
		
		// Применяем изменения видимости
		onVisibilityChange(newVisibleParts);
	};

	// Обработчик переключения режима просмотра
	const handleViewModeChange = (mode: "cumulative" | "isolated") => {
		setViewMode(mode);
	};

	const renderStepTitle = () => {
		if (currentStep === 0) {
			return "Полная модель";
		}
		return instructions[currentStep - 1]?.name || "";
	};

	const getCurrentPartCount = () => {
		if (currentStep === 0) {
			let totalParts = 0;
			for (const step of instructions) {
				totalParts += step.parts.length;
			}
			return totalParts;
		}
		return instructions[currentStep - 1]?.parts.length || 0;
	};

	const getCurrentDescription = () => {
		if (currentStep === 0) {
			return "Просмотр полной модели перед началом сборки";
		}
		return instructions[currentStep - 1]?.description || "";
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={() => handleViewModeChange("cumulative")}
						className={`px-3 py-1 text-sm rounded ${
							viewMode === "cumulative"
								? "bg-red-700 text-white"
								: "bg-gray-200 text-gray-700"
						}`}
						disabled={currentStep === 0}
					>
						Накопительно
					</button>
					<button
						type="button"
						onClick={() => handleViewModeChange("isolated")}
						className={`px-3 py-1 text-sm rounded ${
							viewMode === "isolated"
								? "bg-red-700 text-white"
								: "bg-gray-200 text-gray-700"
						}`}
						disabled={currentStep === 0}
					>
						Изолированно
					</button>
				</div>
			</div>

			{instructions.length > 0 ? (
				<>
					<div className="mb-4">
						<div className="flex justify-between items-center mb-2">
							<h3 className="font-medium">
								Шаг {currentStep} из {instructions.length}:{" "}
								{renderStepTitle()}
							</h3>
							<div className="text-sm text-gray-500">
								{getCurrentPartCount()} деталей
							</div>
						</div>

						{getCurrentDescription() && (
							<div className="bg-gray-100 p-3 rounded text-sm">
								{getCurrentDescription()}
							</div>
						)}
					</div>

					<div className="flex justify-between">
						<button
							type="button"
							onClick={handlePrevStep}
							disabled={currentStep === 0}
							className={`px-4 py-2 rounded flex items-center ${
								currentStep === 0
									? "bg-gray-200 text-gray-400 cursor-not-allowed"
									: "bg-gray-700 text-white hover:bg-gray-800"
							}`}
						>
							<IoChevronBackOutline className="mr-1" />
							Назад
						</button>

						<button
							type="button"
							onClick={handleNextStep}
							disabled={currentStep === instructions.length}
							className={`px-4 py-2 rounded flex items-center ${
								currentStep === instructions.length
									? "bg-gray-200 text-gray-400 cursor-not-allowed"
									: "bg-red-700 text-white hover:bg-red-800"
							}`}
						>
							Далее
							<IoChevronForwardOutline className="ml-1" />
						</button>
					</div>
				</>
			) : (
				<div className="text-center py-8 text-gray-500">
					Инструкции не найдены
				</div>
			)}
		</div>
	);
};

export default InstructionViewer;
