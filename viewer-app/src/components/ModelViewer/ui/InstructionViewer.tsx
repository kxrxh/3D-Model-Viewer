import { useState } from "react";

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
	visibleParts: Record<string, boolean>;
	onVisibilityChange: (parts: Record<string, boolean>) => void;
}

const InstructionViewer: React.FC<InstructionViewerProps> = ({
	instructions,
	currentStep,
	onStepChange,
	visibleParts,
	onVisibilityChange,
}) => {
	const [viewMode, setViewMode] = useState<"cumulative" | "isolated">(
		"cumulative",
	);

	// Handle changing to the next step
	const handleNextStep = () => {
		if (currentStep < instructions.length - 1) {
			onStepChange(currentStep + 1);
			updateVisibleParts(currentStep + 1);
		}
	};

	// Handle changing to the previous step
	const handlePrevStep = () => {
		if (currentStep > 0) {
			onStepChange(currentStep - 1);
			updateVisibleParts(currentStep - 1);
		}
	};

	// Update visible parts based on the current step and view mode
	const updateVisibleParts = (stepIndex: number) => {
		const newVisibleParts: Record<string, boolean> = {};

		if (viewMode === "cumulative") {
			// Show all parts up to and including the current step
			for (let i = 0; i <= stepIndex; i++) {
				if (instructions[i]?.parts) {
					for (const part of instructions[i].parts) {
						newVisibleParts[part] = true;
					}
				}
			}
		} else {
			// Only show parts from the current step
			if (instructions[stepIndex]?.parts) {
				for (const part of instructions[stepIndex].parts) {
					newVisibleParts[part] = true;
				}
			}
		}

		// Update parts visibility
		onVisibilityChange(newVisibleParts);
	};

	// Handle view mode change
	const handleViewModeChange = (mode: "cumulative" | "isolated") => {
		setViewMode(mode);
		updateVisibleParts(currentStep);
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
								Шаг {currentStep + 1} из {instructions.length}:{" "}
								{instructions[currentStep]?.name}
							</h3>
							<div className="text-sm text-gray-500">
								{instructions[currentStep]?.parts.length} деталей
							</div>
						</div>

						{instructions[currentStep]?.description && (
							<div className="bg-gray-100 p-3 rounded text-sm">
								{instructions[currentStep].description}
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
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4 mr-1"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							Назад
						</button>

						<button
							type="button"
							onClick={handleNextStep}
							disabled={currentStep === instructions.length - 1}
							className={`px-4 py-2 rounded flex items-center ${
								currentStep === instructions.length - 1
									? "bg-gray-200 text-gray-400 cursor-not-allowed"
									: "bg-red-700 text-white hover:bg-red-800"
							}`}
						>
							Далее
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-4 w-4 ml-1"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
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
