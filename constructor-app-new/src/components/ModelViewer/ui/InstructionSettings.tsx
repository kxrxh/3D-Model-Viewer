import type React from "react";
import {
	IoColorPaletteOutline,
	IoColorWandOutline,
	IoEyeOutline,
	IoRefreshOutline,
	IoBrushOutline,
} from "react-icons/io5";
import { isLightColor } from "../utils";
import {
	DEFAULT_HIGHLIGHT_COLOR,
	DEFAULT_PREVIOUS_STEPS_OPACITY,
	DEFAULT_BACKGROUND_COLOR,
} from "../utils/constants";

interface InstructionSettingsProps {
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
	backgroundColor: string;
	onBackgroundColorChange: (color: string) => void;
}

const InstructionSettings: React.FC<InstructionSettingsProps> = ({
	highlightEnabled,
	onHighlightEnabledChange,
	highlightColor = DEFAULT_HIGHLIGHT_COLOR,
	onHighlightColorChange,
	previousStepsTransparency,
	onPreviousStepsTransparencyChange,
	previousStepsOpacity = DEFAULT_PREVIOUS_STEPS_OPACITY,
	onPreviousStepsOpacityChange,
	autoRotationEnabled,
	onAutoRotationChange,
	backgroundColor = DEFAULT_BACKGROUND_COLOR,
	onBackgroundColorChange,
}) => {
	const handleHighlightColorInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		onHighlightColorChange(e.target.value);
	};

	const handlePreviousStepsOpacityInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		onPreviousStepsOpacityChange(Number.parseFloat(e.target.value));
	};
	
	const handleBackgroundColorInputChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		onBackgroundColorChange(e.target.value);
	};

	return (
		<div className="p-2">
			<div className="space-y-3">
				{/* Включение/отключение подсветки */}
				<div className="flex items-center justify-between">
					<label
						htmlFor="highlight-toggle"
						className="text-sm text-gray-700 flex items-center gap-1.5 cursor-pointer"
					>
						<IoColorPaletteOutline
							size={16}
							className={highlightEnabled ? "text-red-600" : "text-gray-500"}
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
								onChange={() => onHighlightEnabledChange(!highlightEnabled)}
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
								previousStepsTransparency ? "text-blue-600" : "text-gray-500"
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
								onChange={() =>
									onPreviousStepsTransparencyChange(!previousStepsTransparency)
								}
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
								onChange={() => onAutoRotationChange(!autoRotationEnabled)}
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
								onChange={handlePreviousStepsOpacityInputChange}
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
								onChange={handleHighlightColorInputChange}
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
							onChange={handleBackgroundColorInputChange}
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
	);
};

export default InstructionSettings; 