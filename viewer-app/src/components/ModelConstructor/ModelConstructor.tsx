import { useRef, useCallback, useEffect, useMemo, Suspense } from "react";
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
import { Model } from "../common/core";
import PartFocusController from "../common/controls/PartFocusController";
import { InstructionBuilder } from "./ui";
import InstructionSettings from "./ui/InstructionSettings";
import InstructionSteps from "./ui/InstructionSteps";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { MdKeyboardArrowLeft } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";

import { useModelState } from "./hooks";
import { usePerformanceProfiles, useToast } from "../common/hooks";
import { useModelConstructor } from "./context/ModelConstructorContext";

import { Widget } from "../common/components";
import { ControlPanel } from "./ui";
import { PerformanceProfileSelector } from "../common/ui";
import PartsSelector from "./ui/PartsSelector";

import type { InstructionStep } from "../common/types";

import {
	DEFAULT_CAMERA_POSITION,
	DEFAULT_CAMERA_TARGET,
} from "../common/utils";

// Performance settings
THREE.Cache.enabled = true;

// Helper function to truncate long names
const truncateName = (name: string, maxLength = 35) => {
	const shortName = name.split("/").pop() || name;
	return shortName.length > maxLength
		? `${shortName.substring(0, maxLength)}...`
		: shortName;
};

const ModelConstructor: React.FC = () => {
	const modelState = useModelState();
	const performanceState = usePerformanceProfiles();
	const { toasts, showToast, hideToast } = useToast();
	const {
		modelUrl,
		instructions,
		isLoading,
		setIsLoading,
		onReset,
		onInstructionsChange,
		highlightColor,
		highlightEnabled,
		previousStepsTransparency,
		previousStepsOpacity,
		autoRotationEnabled,
		setAutoRotationEnabled,
		backgroundColor,
		displayMode,
		currentStepIndex,
		editingStep,
		selectedPartIds,
		showPartsSelector,
		setShowPartsSelector,
		showSettings,
		showStats,
		setShowStats,
		setShowSettings,
		setSelectedPartIds,
		setCurrentStepIndex,
		setEditingStep,
		setHighlightEnabled,
		setHighlightColor,
		setPreviousStepsTransparency,
		setPreviousStepsOpacity,
		setBackgroundColor,
		setDisplayMode,
	} = useModelConstructor();

	const {
		modelParts,
		visibleParts,
		setVisibleParts,
		currentStepParts,
		setCurrentStepParts,
		selectedParts,
		setSelectedParts,
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

	const controlsRef = useRef<OrbitControlsImpl>(null);
	const sceneRef = useRef(null);

	// Add function to collect all parts used in steps
	const getPartsUsedInSteps = useCallback(() => {
		const usedParts = new Set<string>();
		for (const step of instructions) {
			// Skip the current editing step
			if (editingStep && step.id === editingStep.id) {
				continue;
			}
			for (const part of step.parts) {
				usedParts.add(part);
			}
		}
		return Array.from(usedParts);
	}, [instructions, editingStep]);

	const handleVisibilityChange = useCallback(
		(newVisibleParts: Record<string, boolean>) => {
			setVisibleParts(newVisibleParts);
		},
		[setVisibleParts],
	);

	const resetView = useCallback(() => {
		setSelectedParts([]);
		setCurrentStepParts([]);
		setSelectedPartIds([]);
		setCurrentStepIndex(-1);
		setEditingStep(null);
		if (controlsRef.current) {
			controlsRef.current.object.position.set(...DEFAULT_CAMERA_POSITION);
			controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET);
			controlsRef.current.reset();
			controlsRef.current.update();
		}
	}, [
		setSelectedParts,
		setCurrentStepParts,
		setSelectedPartIds,
		setCurrentStepIndex,
		setEditingStep,
	]);

	const handleInstructionsChange = useCallback(
		(newInstructions: InstructionStep[]) => {
			// Update instructions in parent component
			onInstructionsChange(newInstructions);
			// Clear highlighting when instructions are updated (step created/edited)
			setSelectedPartIds([]);
			setCurrentStepParts([]);
			// Clear editing step when instructions change
			setEditingStep(null);
		},
		[
			setCurrentStepParts,
			onInstructionsChange,
			setSelectedPartIds,
			setEditingStep,
		],
	);

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
			setAutoRotationEnabled,
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
				// Update current step parts for highlighting
				setCurrentStepParts(stepParts);
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
			setCurrentStepParts,
			showToast,
			autoRotationEnabled,
			setAutoRotationEnabled,
		],
	);

	// Handle parts selection
	const handlePartsChange = useCallback(
		(partIds: string[]) => {
			setSelectedPartIds(partIds);
			// Update current step parts for highlighting
			setCurrentStepParts(partIds);
		},
		[setCurrentStepParts, setSelectedPartIds],
	);

	// Handle parts selector close
	const handlePartsSelectorClose = useCallback(() => {
		setShowPartsSelector(false);
	}, [setShowPartsSelector]);

	// Update visibility based on display mode and selected parts
	useEffect(() => {
		if (!modelParts) return;

		const newVisibleParts: Record<string, boolean> = {};

		if (displayMode === "all") {
			// Show all parts
			for (const partId of Object.keys(modelParts)) {
				newVisibleParts[partId] = true;
			}
		} else {
			// Show only selected parts and current step parts
			for (const partId of Object.keys(modelParts)) {
				newVisibleParts[partId] =
					selectedPartIds.includes(partId) || currentStepParts.includes(partId);
			}
		}

		setVisibleParts(newVisibleParts);
	}, [
		displayMode,
		modelParts,
		selectedPartIds,
		currentStepParts,
		setVisibleParts,
	]);

	// Handle model loading completion
	useEffect(() => {
		if (modelParts && Object.keys(modelParts).length > 0) {
			setIsLoading(false);
			// Visibility will be handled by the display mode effect
		}
	}, [modelParts, setIsLoading]);

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
					preserveDrawingBuffer: true,
					logarithmicDepthBuffer: true,
				}}
				style={{ width: "100%", height: "100%" }}
				shadows={profiles[activeProfile as keyof typeof profiles].shadows}
				onCreated={({ gl }) => {
					gl.setClearColor(new THREE.Color("#E2E8F0"), 1);
					// @ts-ignore - physicallyCorrectLights exists in THREE.js but might be deprecated
					gl.physicallyCorrectLights =
						profiles[
							activeProfile as keyof typeof profiles
						].physicallyCorrectLights;

					// Configure texture handling
					const glContext = gl.getContext();
					if (glContext) {
						glContext.pixelStorei(glContext.UNPACK_FLIP_Y_WEBGL, false);
						glContext.pixelStorei(
							glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
							false,
						);

						// Ensure viewport matches canvas size
						const canvas = gl.domElement;
						glContext.viewport(0, 0, canvas.width, canvas.height);
					}
				}}
			>
				<color attach="background" args={[backgroundColor]} />

				{adaptiveDprEnabled && (
					<PerformanceMonitor
						onIncline={() => handlePerformanceChange(true)}
						onDecline={() => handlePerformanceChange(false)}
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

	const handleEditStep = (step: InstructionStep | null) => {
		if (step) {
			setEditingStep(step);
			const index = instructions.findIndex((s) => s.id === step.id);
			setCurrentStepIndex(index);
			handleStepPartsFocus(step.parts);
			// Set selected parts when editing a step
			setSelectedPartIds(step.parts);
		} else {
			setEditingStep(null);
			setCurrentStepIndex(-1);
			handleStepPartsFocus([]);
			// Clear selected parts when not editing
			setSelectedPartIds([]);
		}
	};

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

			<Widget
				title="Инструкция по сборке"
				initialPosition={{ x: 20, y: 70 }}
				minWidth={400}
			>
				<InstructionBuilder
					instructions={instructions}
					onInstructionsChange={handleInstructionsChange}
					onVisibilityChange={handleVisibilityChange}
					onPartFocus={handlePartFocus}
					showToast={showToast}
					highlightEnabled={highlightEnabled}
					onHighlightEnabledChange={setHighlightEnabled}
					highlightColor={highlightColor}
					onHighlightColorChange={setHighlightColor}
					previousStepsTransparency={previousStepsTransparency}
					onPreviousStepsTransparencyChange={setPreviousStepsTransparency}
					previousStepsOpacity={previousStepsOpacity}
					onPreviousStepsOpacityChange={setPreviousStepsOpacity}
					autoRotationEnabled={autoRotationEnabled}
					onAutoRotationChange={setAutoRotationEnabled}
					truncateName={truncateName}
					backgroundColor={backgroundColor}
					onBackgroundColorChange={setBackgroundColor}
					availableParts={selectedPartIds}
					onPartsSelectorOpen={() => setShowPartsSelector(true)}
					selectedParts={selectedPartIds}
					onSelectedPartsChange={setSelectedPartIds}
					displayMode={displayMode}
					onDisplayModeChange={setDisplayMode}
					modelUrl={modelUrl}
					editingStep={editingStep}
					onEditingStepChange={handleEditStep}
				/>
			</Widget>

			{/* Instruction Steps Widget */}
			<Widget
				title="Шаги инструкции"
				initialPosition={{ x: window.innerWidth - 410, y: 70 }}
				minWidth={400}
			>
				<InstructionSteps
					instructions={instructions}
					onInstructionsChange={handleInstructionsChange}
					onPartFocus={handlePartFocus}
					onStepPartsFocus={handleStepPartsFocus}
					showToast={showToast}
					currentStepIndex={currentStepIndex}
					setCurrentStepIndex={setCurrentStepIndex}
					onEditingStepChange={handleEditStep}
				/>
			</Widget>

			{/* Settings Widget */}
			<button
				type="button"
				onClick={() => setShowSettings(!showSettings)}
				className="absolute bottom-2.5 right-2.5 p-2.5 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 z-10 flex items-center gap-2 text-gray-700 hover:text-gray-900"
			>
				<IoSettingsOutline size={20} title="Settings" />
				<span className="text-sm font-medium">
					{showSettings ? "Закрыть настройки" : "Открыть настройки"}
				</span>
			</button>

			{showSettings && (
				<Widget
					title="Настройки"
					initialPosition={{
						x: window.innerWidth - 410,
						y: window.innerHeight - 400,
					}}
					minWidth={400}
				>
					<div className="p-4">
						<InstructionSettings
							highlightEnabled={highlightEnabled}
							onHighlightEnabledChange={setHighlightEnabled}
							highlightColor={highlightColor}
							onHighlightColorChange={setHighlightColor}
							previousStepsTransparency={previousStepsTransparency}
							onPreviousStepsTransparencyChange={setPreviousStepsTransparency}
							previousStepsOpacity={previousStepsOpacity}
							onPreviousStepsOpacityChange={setPreviousStepsOpacity}
							autoRotationEnabled={autoRotationEnabled}
							onAutoRotationChange={setAutoRotationEnabled}
							backgroundColor={backgroundColor}
							onBackgroundColorChange={setBackgroundColor}
						/>
					</div>
				</Widget>
			)}

			{/* Parts Selector Widget */}
			{showPartsSelector && (
				<Widget
					title="Выбор деталей"
					initialPosition={{ x: 520, y: 70 }}
					minWidth={400}
				>
					<PartsSelector
						availableParts={Object.keys(modelParts || {})}
						selectedParts={selectedPartIds}
						onPartsChange={handlePartsChange}
						onClose={handlePartsSelectorClose}
						partsUsedInSteps={getPartsUsedInSteps()}
						isEditing={true}
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
};

export default ModelConstructor;
