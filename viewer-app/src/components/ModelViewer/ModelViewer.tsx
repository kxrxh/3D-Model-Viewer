import {
	useRef,
	useState,
	useCallback,
	useEffect,
	useMemo,
	Suspense,
	type Dispatch,
	type SetStateAction,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
	OrbitControls,
	Environment,
	Stage,
	BakeShadows,
	AdaptiveDpr,
	AdaptiveEvents,
	Stats,
	PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import { LoadingSpinner, Toast, ToastContainer } from "../common";
import { Model } from "./core";
import PartFocusController from "./controls/PartFocusController";
import { InstructionViewer } from "./ui";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MdKeyboardArrowLeft } from "react-icons/md";

import { useModelState, usePerformanceProfiles, useToast } from "./hooks";

import { Widget } from "./components";
import { ControlPanel, PerformanceProfileSelector } from "./ui";

import type { InstructionStep } from "./types";

import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from "./utils";

// Performance settings
THREE.Cache.enabled = true;

// Helper function to truncate long names
const truncateName = (name: string, maxLength = 35) => {
	const shortName = name.split("/").pop() || name;
	return shortName.length > maxLength
		? `${shortName.substring(0, maxLength)}...`
		: shortName;
};

interface ModelViewerProps {
	modelUrl: string | null;
	instructions: InstructionStep[];
	isLoading: boolean;
	setIsLoading: Dispatch<SetStateAction<boolean>>;
	onReset: () => void;
}

export default function ModelViewer({
	modelUrl,
	instructions,
	isLoading,
	setIsLoading,
	onReset,
}: ModelViewerProps) {
	const modelState = useModelState();
	const performanceState = usePerformanceProfiles();
	const { toasts, showToast, hideToast } = useToast();

	// Add state for instructions
	const [currentStep, setCurrentStep] = useState<number>(0);
	const [highlightColor, setHighlightColor] = useState<string>("#f87171"); // Default to a light red color
	const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);
	const [previousStepsTransparency, setPreviousStepsTransparency] =
		useState<boolean>(true); // Enable by default
	const [previousStepsOpacity, setPreviousStepsOpacity] = useState<number>(0.4); // 40% opacity by default
	const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(true); // Enable by default
	const [backgroundColor, setBackgroundColor] = useState<string>("#E2E8F0"); // Default background

	const {
		modelParts,
		visibleParts,
		setVisibleParts,
		currentStepParts,
		setCurrentStepParts,
		selectedParts,
		setSelectedParts,
		resetModelState,
		handleModelLoad,
		handlePartFound,
	} = modelState;

	const {
		profiles,
		activeProfile,
		setActiveProfile,
		dpr,
		adaptiveDprEnabled,
		handlePerformanceChange,
	} = performanceState;

	// Component state
	const [showStats, setShowStats] = useState(false);
	const controlsRef = useRef<OrbitControlsImpl>(null);
	const sceneRef = useRef(null);

	// Update currentStepParts when currentStep changes
	useEffect(() => {
		if (currentStep === 0 || !instructions.length) {
			setCurrentStepParts([]);
			return;
		}

		const stepIndex = currentStep - 1;
		if (stepIndex >= 0 && stepIndex < instructions.length) {
			setCurrentStepParts(instructions[stepIndex].parts);
		}
	}, [currentStep, instructions, setCurrentStepParts]);

	const handleVisibilityChange = useCallback(
		(newVisibleParts: Record<string, boolean>) => {
			setVisibleParts(newVisibleParts);
		},
		[setVisibleParts],
	);

	const handleHighlightColorChange = useCallback((color: string) => {
		setHighlightColor(color);
	}, []);

	const handleHighlightEnabledChange = useCallback(
		(enabled: boolean) => {
			console.log(
				"Изменение состояния подсветки:",
				enabled ? "включена" : "выключена",
			);
			setHighlightEnabled(enabled);
			showToast(
				`Подсветка деталей ${enabled ? "включена" : "выключена"}`,
				enabled ? "success" : "info",
			);
		},
		[showToast],
	);

	const handlePreviousStepsTransparencyChange = useCallback(
		(enabled: boolean) => {
			console.log(
				"Изменение прозрачности предыдущих шагов:",
				enabled ? "включена" : "выключена",
			);
			setPreviousStepsTransparency(enabled);
			showToast(
				`Прозрачность предыдущих шагов ${enabled ? "включена" : "выключена"}`,
				"info",
			);
		},
		[showToast],
	);

	const handlePreviousStepsOpacityChange = useCallback((opacity: number) => {
		setPreviousStepsOpacity(opacity);
	}, []);

	const handleAutoRotationChange = useCallback(
		(enabled: boolean) => {
			console.log(
				"Изменение автовращения модели:",
				enabled ? "включено" : "выключено",
			);
			setAutoRotationEnabled(enabled);
			showToast(
				`Автовращение модели ${enabled ? "включено" : "выключено"}`,
				"info",
			);
		},
		[showToast],
	);

	const handleBackgroundColorChange = useCallback((color: string) => {
		setBackgroundColor(color);
	}, []);

	const resetView = useCallback(() => {
		setSelectedParts([]);
		if (controlsRef.current) {
			controlsRef.current.object.position.set(...DEFAULT_CAMERA_POSITION);
			controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET);
			controlsRef.current.reset();
			controlsRef.current.update();
		}
	}, [setSelectedParts]);

	// Handle focusing on a specific part
	const handlePartFocus = useCallback(
		(partName: string) => {
			if (modelParts?.[partName] && modelState.meshes[partName]) {
				// Set the selected part's mesh for the PartFocusController to handle
				setSelectedParts([modelState.meshes[partName]]);
				const partDisplayName = truncateName(partName);
				showToast(`Фокус на деталь: ${partDisplayName}`, "info");

				// Disable auto-rotation when focusing on a part
				if (autoRotationEnabled) {
					setAutoRotationEnabled(false);
				}
			}
		},
		[
			modelParts,
			modelState.meshes,
			setSelectedParts,
			showToast,
			autoRotationEnabled,
		],
	);

	// Handle focusing on all parts in a step
	const handleStepPartsFocus = useCallback(
		(stepParts: string[]) => {
			// Collect all available meshes for the parts in this step
			const meshes = stepParts
				.filter((part) => modelParts?.[part] && modelState.meshes[part])
				.map((part) => modelState.meshes[part]);

			if (meshes.length > 0) {
				// Set all part meshes for this step to focus on
				setSelectedParts(meshes);
				showToast(`Фокус на все детали шага (${meshes.length} шт.)`, "info");

				// Disable auto-rotation
				if (autoRotationEnabled) {
					setAutoRotationEnabled(false);
				}
			}
		},
		[
			modelParts,
			modelState.meshes,
			setSelectedParts,
			showToast,
			autoRotationEnabled,
		],
	);

	// Handle model loading completion
	useEffect(() => {
		if (modelParts && Object.keys(modelParts).length > 0) {
			setIsLoading(false);

			// Initialize with all parts visible if we're at step 0
			if (currentStep === 0) {
				const initialVisibleParts: Record<string, boolean> = {};
				for (const part in modelParts) {
					initialVisibleParts[part] = true;
				}
				setVisibleParts(initialVisibleParts);
			}
		}
	}, [modelParts, currentStep, setVisibleParts, setIsLoading]);

	// Clean up object URL on unmount
	useEffect(() => {
		return () => {
			if (modelUrl) URL.revokeObjectURL(modelUrl);
		};
	}, [modelUrl]);

	const Scene3D = useMemo(
		() => (
			<Canvas
				ref={sceneRef}
				camera={{
					position: DEFAULT_CAMERA_POSITION,
					fov: 30,
					near: 0.1,
					far: 1000,
				}}
				dpr={dpr}
				gl={{
					alpha: true,
					powerPreference: profiles[activeProfile as keyof typeof profiles].gl
						.powerPreference as WebGLPowerPreference,
					stencil: false,
					depth: true,
					antialias:
						profiles[activeProfile as keyof typeof profiles].gl.antialias,
					precision:
						profiles[activeProfile as keyof typeof profiles].gl.precision,
				}}
				shadows={profiles[activeProfile as keyof typeof profiles].shadows}
				onCreated={({ gl }) => {
					gl.setClearColor(new THREE.Color("#E2E8F0"), 1);
					// @ts-ignore - physicallyCorrectLights exists in THREE.js but might be deprecated
					gl.physicallyCorrectLights =
						profiles[
							activeProfile as keyof typeof profiles
						].physicallyCorrectLights;
				}}
			>
				<color attach="background" args={[backgroundColor]} />

				{adaptiveDprEnabled && (
					<PerformanceMonitor
						onIncline={() => handlePerformanceChange(true)}
						onDecline={() => handlePerformanceChange(false)}
						// @ts-ignore - bounds prop exists in drei but TS definition might be wrong
						bounds={[45, 60]}
						flipflops={3}
					/>
				)}

				<Suspense fallback={null}>
					<Stage
						adjustCamera={false}
						intensity={1}
						shadows={profiles[activeProfile as keyof typeof profiles].shadows}
						// @ts-ignore - environment prop exists in drei but TS definition might be wrong
						environment={
							profiles[activeProfile as keyof typeof profiles].environment
						}
						preset="rembrandt"
						ground={false}
					>
						<Model
							url={modelUrl || ""}
							visibleParts={visibleParts}
							currentStepParts={currentStepParts}
							highlightColor={highlightColor}
							highlightEnabled={highlightEnabled}
							previousStepsTransparency={previousStepsTransparency}
							previousStepsOpacity={previousStepsOpacity}
							onLoad={handleModelLoad}
							onPartFound={handlePartFound}
						/>
					</Stage>
				</Suspense>

				<OrbitControls
					ref={controlsRef}
					makeDefault
					autoRotate={autoRotationEnabled && selectedParts.length === 0}
					autoRotateSpeed={0.5}
					enableZoom={true}
					enablePan={true}
					minPolarAngle={0}
					maxPolarAngle={Math.PI}
					minAzimuthAngle={Number.NEGATIVE_INFINITY}
					maxAzimuthAngle={Number.POSITIVE_INFINITY}
					enableDamping={true}
					dampingFactor={0.05}
					rotateSpeed={0.8}
					zoomSpeed={1.2}
				/>

				<Environment preset="sunset" background={false} />

				<Suspense fallback={null}>
					<PartFocusController
						selectedParts={selectedParts}
						controls={controlsRef}
					/>
				</Suspense>

				{adaptiveDprEnabled && <AdaptiveDpr pixelated={false} />}
				<AdaptiveEvents />
				<BakeShadows />

				{showStats && <Stats />}
			</Canvas>
		),
		[
			modelUrl,
			visibleParts,
			currentStepParts,
			highlightColor,
			highlightEnabled,
			handleModelLoad,
			handlePartFound,
			selectedParts,
			showStats,
			dpr,
			activeProfile,
			profiles,
			adaptiveDprEnabled,
			handlePerformanceChange,
			previousStepsTransparency,
			previousStepsOpacity,
			autoRotationEnabled,
			backgroundColor,
		],
	);

	return (
		<div className="w-full h-screen relative bg-gradient-to-br from-slate-100 to-slate-200">
			{isLoading && <LoadingSpinner text="Загрузка модели..." />}

			<ControlPanel
				resetView={resetView}
				showStats={showStats}
				setShowStats={setShowStats}
			/>

			<div className="absolute top-2.5 right-2.5 z-10">
				<PerformanceProfileSelector
					profiles={profiles}
					activeProfile={activeProfile}
					setActiveProfile={setActiveProfile}
				/>
			</div>

			{instructions.length > 0 && (
				<Widget
					title="Инструкция по сборке"
					initialPosition={{ x: 10, y: 70 }}
					minWidth={500}
				>
					<InstructionViewer
						instructions={instructions}
						currentStep={currentStep}
						onStepChange={setCurrentStep}
						onVisibilityChange={handleVisibilityChange}
						onPartFocus={handlePartFocus}
						onStepPartsFocus={handleStepPartsFocus}
						showToast={showToast}
						highlightEnabled={highlightEnabled}
						onHighlightEnabledChange={handleHighlightEnabledChange}
						highlightColor={highlightColor}
						onHighlightColorChange={handleHighlightColorChange}
						previousStepsTransparency={previousStepsTransparency}
						onPreviousStepsTransparencyChange={
							handlePreviousStepsTransparencyChange
						}
						previousStepsOpacity={previousStepsOpacity}
						onPreviousStepsOpacityChange={handlePreviousStepsOpacityChange}
						autoRotationEnabled={autoRotationEnabled}
						onAutoRotationChange={handleAutoRotationChange}
						truncateName={truncateName}
						backgroundColor={backgroundColor}
						onBackgroundColorChange={handleBackgroundColorChange}
					/>
				</Widget>
			)}

			<button
				type="button"
				onClick={() => {
					if (modelUrl) URL.revokeObjectURL(modelUrl);
					setIsLoading(true);
					onReset();
				}}
				className="absolute bottom-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 z-10 flex items-center gap-2"
			>
				<MdKeyboardArrowLeft size={20} title="Back" />
				Загрузить другую модель
			</button>

			{Scene3D}

			{/* Toast Container */}
			<ToastContainer>
				{toasts.map((toast) => (
					<Toast
						key={toast.id}
						message={toast.message}
						type={toast.type}
						onClose={() => hideToast(toast.id)}
					/>
				))}
			</ToastContainer>
		</div>
	);
}

// Функция для определения, является ли цвет светлым (для выбора контрастного текста)
