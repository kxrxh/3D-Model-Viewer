import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
	useMemo,
	Suspense,
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
import {
	LoadingSpinner,
	Toast,
	ToastContainer,
	type ToastType,
} from "../common";
import { Model } from "./core";
import PartFocusController from "./controls/PartFocusController";
import { InstructionViewer, Widget } from "./ui";
import StartPage from "./StartPage";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import JSZip from "jszip";
// Import react-icons
import { FiRefreshCw } from "react-icons/fi";
import { VscGraph } from "react-icons/vsc";
import { MdKeyboardArrowDown, MdKeyboardArrowLeft } from "react-icons/md";

// Performance settings
THREE.Cache.enabled = true;
const DEFAULT_CAMERA_POSITION: [number, number, number] = [5, 5, 5];
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0];
const MIN_DPR = 1;
const MAX_DPR = window.devicePixelRatio || 2;

// Check if deviceMemory is available
const hasDeviceMemory = "deviceMemory" in navigator;
const getDeviceMemory = (): number => {
	return hasDeviceMemory
		? (navigator as unknown as { deviceMemory: number }).deviceMemory
		: 4;
};

// Performance profiles for different rendering quality
const PERFORMANCE_PROFILES = {
	high: {
		name: "Высокое качество",
		dpr: Math.min(2.5, window.devicePixelRatio || 1.5),
		shadows: true,
		shadowMapSize: 2048,
		antialias: true,
		physicallyCorrectLights: true,
		environment: "city",
		adaptiveDpr: false,
		gl: {
			powerPreference: "high-performance",
			precision: "highp",
			antialias: true,
			alpha: true,
		},
	},
	medium: {
		name: "Среднее качество",
		dpr: Math.min(1.25, window.devicePixelRatio || 1),
		shadows: true,
		shadowMapSize: 1024,
		antialias: true,
		physicallyCorrectLights: true,
		environment: "city",
		adaptiveDpr: false,
		gl: {
			powerPreference: "high-performance",
			precision: "mediump",
			antialias: true,
		},
	},
	low: {
		name: "Низкое качество",
		dpr: 0.75,
		shadows: false,
		antialias: false,
		physicallyCorrectLights: false,
		environment: "city",
		adaptiveDpr: false,
		pixelRatio: 0.75,
		gl: {
			powerPreference: "low-power",
			precision: "lowp",
			antialias: false,
			depth: false,
			stencil: false,
		},
	},
	auto: {
		name: "Автоматически",
		adaptiveDpr: true,
		adaptivePerformance: true,
		dpr:
			window.devicePixelRatio > 2
				? 1.5
				: window.devicePixelRatio > 1
					? window.devicePixelRatio
					: 1,
		shadows: navigator.hardwareConcurrency > 4,
		shadowMapSize: navigator.hardwareConcurrency > 6 ? 1024 : 512,
		antialias: getDeviceMemory() > 4 || navigator.hardwareConcurrency > 4,
		physicallyCorrectLights: navigator.hardwareConcurrency > 2,
		environment: "city",
		regress: true,
		gl: {
			powerPreference: "high-performance",
			precision: navigator.hardwareConcurrency > 4 ? "highp" : "mediump",
			antialias: getDeviceMemory() > 4 || navigator.hardwareConcurrency > 4,
			failIfMajorPerformanceCaveat: false,
		},
	},
};

// Custom hooks for better state management
function useModelState() {
	const [modelParts, setModelParts] = useState<Record<string, boolean>>({});
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [meshes, setMeshes] = useState<Record<string, THREE.Mesh>>({});
	const [selectedParts, setSelectedParts] = useState<THREE.Mesh[]>([]);
	const [modelUrl, setModelUrl] = useState<string | null>(null);
	const isInitialized = useRef(false);

	const resetModelState = useCallback(() => {
		isInitialized.current = false;
		setModelParts({});
		setVisibleParts({});
		setMeshes({});
		setSelectedParts([]);
	}, []);

	const handleModelLoad = useCallback((parts: Record<string, boolean>) => {
		if (!isInitialized.current) {
			setModelParts(parts);
			setVisibleParts(parts);
			isInitialized.current = true;
		}
	}, []);

	const handlePartFound = useCallback(
		(meshRefs: Record<string, THREE.Mesh>) => {
			setMeshes(meshRefs);
		},
		[],
	);

	return {
		modelParts,
		visibleParts,
		setVisibleParts,
		meshes,
		selectedParts,
		setSelectedParts,
		modelUrl,
		setModelUrl,
		isInitialized,
		resetModelState,
		handleModelLoad,
		handlePartFound,
	};
}

function usePerformanceProfiles() {
	const [activeProfile, setActiveProfile] = useState<string>("auto");
	const [dpr, setDpr] = useState<number>(
		PERFORMANCE_PROFILES.auto.dpr as number,
	);

	const adaptiveDprEnabled = useMemo(
		() =>
			PERFORMANCE_PROFILES[activeProfile as keyof typeof PERFORMANCE_PROFILES]
				.adaptiveDpr === true,
		[activeProfile],
	);

	const handlePerformanceChange = useCallback(
		(increase: boolean) => {
			if (adaptiveDprEnabled) {
				setDpr((prevDpr) => {
					if (increase) {
						return Math.min(prevDpr + 0.25, MAX_DPR);
					}
					return Math.max(prevDpr - 0.25, MIN_DPR);
				});
			}
		},
		[adaptiveDprEnabled],
	);

	useEffect(() => {
		const profile =
			PERFORMANCE_PROFILES[activeProfile as keyof typeof PERFORMANCE_PROFILES];
		if (profile?.dpr) {
			setDpr(profile.dpr as number);
		}
	}, [activeProfile]);

	return {
		profiles: PERFORMANCE_PROFILES,
		activeProfile,
		setActiveProfile,
		dpr,
		setDpr,
		adaptiveDprEnabled,
		handlePerformanceChange,
	};
}

// Toast hook for managing toast notifications
function useToast() {
	const [toasts, setToasts] = useState<
		{ id: number; message: string; type: ToastType }[]
	>([]);

	const showToast = useCallback((message: string, type: ToastType = "info") => {
		const id = Date.now();
		setToasts((prev) => [...prev, { id, message, type }]);
		return id;
	}, []);

	const hideToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	return { toasts, showToast, hideToast };
}

const ControlPanel: React.FC<{
	resetView: () => void;
	showStats: boolean;
	setShowStats: (show: boolean) => void;
}> = React.memo(({ resetView, showStats, setShowStats }) => (
	<div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2.5 z-10">
		<button
			type="button"
			onClick={resetView}
			className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5"
		>
			<FiRefreshCw size={16} title="Reset View" />
			Сбросить вид
		</button>
		<button
			type="button"
			onClick={() => setShowStats(!showStats)}
			className={`px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 ${
				showStats ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-700"
			}`}
		>
			<VscGraph size={16} title="Statistics" />
			Статистика
		</button>
	</div>
));

// Add Performance Profile Selector component
const PerformanceProfileSelector: React.FC<{
	profiles: typeof PERFORMANCE_PROFILES;
	activeProfile: string;
	setActiveProfile: (profile: string) => void;
}> = React.memo(({ profiles, activeProfile, setActiveProfile }) => {
	const [isCollapsed, setIsCollapsed] = useState(true);

	return (
		<div className="flex flex-col bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-10 w-80">
			<button
				className="w-full text-sm font-medium text-gray-700 flex justify-between items-center cursor-pointer py-1"
				onClick={() => setIsCollapsed(!isCollapsed)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						setIsCollapsed(!isCollapsed);
					}
				}}
				type="button"
			>
				<span>Качество</span>
				<div className="flex items-center">
					<span className="text-xs mr-1 text-gray-500">
						{profiles[activeProfile as keyof typeof profiles].name}
					</span>
					<span
						className={`transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"} inline-flex`}
					>
						<MdKeyboardArrowDown size={12} title="Toggle" />
					</span>
				</div>
			</button>

			{!isCollapsed && (
				<div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-gray-200">
					{Object.entries(profiles).map(([key, profile]) => (
						<label key={key} className="relative flex items-center">
							<input
								type="radio"
								value={key}
								checked={activeProfile === key}
								onChange={() => setActiveProfile(key)}
								className="sr-only peer"
							/>
							<span className="px-2 py-1 rounded cursor-pointer text-xs font-medium w-full text-left transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800 flex justify-between">
								<span>{profile.name}</span>
								{key === "auto" && (
									<span className="text-xs opacity-70 self-center ml-1">
										(А)
									</span>
								)}
							</span>
						</label>
					))}
				</div>
			)}
		</div>
	);
});

// Main component
export default function ModelViewer() {
	// Use custom hooks for state management
	const modelState = useModelState();
	const performanceState = usePerformanceProfiles();
	const { toasts, showToast, hideToast } = useToast();

	// Add state for instructions
	interface InstructionStep {
		id: number;
		name: string;
		parts: string[];
		description?: string;
	}

	const [instructions, setInstructions] = useState<InstructionStep[]>([]);
	const [currentStep, setCurrentStep] = useState<number>(0);
	const [hasInstructions, setHasInstructions] = useState<boolean>(false);
	const [hasModel, setHasModel] = useState<boolean>(false);

	const {
		modelParts,
		visibleParts,
		setVisibleParts,
		modelUrl,
		setModelUrl,
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
	const [isLoading, setIsLoading] = useState(false);
	const [showStats, setShowStats] = useState(false);
	const controlsRef = useRef<OrbitControlsImpl>(null);
	const sceneRef = useRef(null);

	// Handle file uploads
	const handleModelUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				// Clean up previous object URL if exists
				if (modelUrl) URL.revokeObjectURL(modelUrl);

				const url = URL.createObjectURL(file);
				setModelUrl(url);
				setIsLoading(true);
				setHasModel(true);

				// Reset model states
				resetModelState();

				console.log(
					`Загружена модель: ${file.name}, размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ`,
				);
			}
		},
		[modelUrl, resetModelState, setModelUrl],
	);

	// Обработка загрузки нескольких файлов
	const handleMultiUpload = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (!files || files.length === 0) return;

			// Проверяем наличие модели и инструкций
			let modelFile: File | null = null;
			let instructionFile: File | null = null;
			let zipFile: File | null = null;

			// Сначала ищем файлы по типам
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const fileName = file.name.toLowerCase();

				if (fileName.endsWith(".glb") || fileName.endsWith(".gltf")) {
					modelFile = file;
				} else if (fileName.endsWith(".json")) {
					instructionFile = file;
				} else if (fileName.endsWith(".zip")) {
					zipFile = file;
				}
			}

			// Обрабатываем архив ZIP, если он найден
			if (zipFile) {
				try {
					const zip = new JSZip();
					const zipContent = await zip.loadAsync(zipFile);

					// Ищем модели и инструкции в архиве
					for (const [fileName, fileData] of Object.entries(zipContent.files)) {
						if (fileData.dir) continue; // Пропускаем директории

						const lowerFileName = fileName.toLowerCase();

						// Найдена модель в архиве
						if (
							lowerFileName.endsWith(".glb") ||
							lowerFileName.endsWith(".gltf")
						) {
							if (!modelFile) {
								// Берем только если еще не нашли модель
								const blob = await fileData.async("blob");
								modelFile = new File([blob], fileName, {
									type: lowerFileName.endsWith(".glb")
										? "model/gltf-binary"
										: "model/gltf+json",
								});
								console.log(`Извлечена модель из архива: ${fileName}`);
							}
						}
						// Найдены инструкции в архиве
						else if (lowerFileName.endsWith(".json")) {
							if (!instructionFile) {
								// Берем только если еще не нашли инструкции
								const blob = await fileData.async("blob");
								instructionFile = new File([blob], fileName, {
									type: "application/json",
								});
								console.log(`Извлечены инструкции из архива: ${fileName}`);
							}
						}
					}

					if (!modelFile && !instructionFile) {
						showToast(
							"В архиве не найдено ни моделей (.glb/.gltf), ни инструкций (.json)",
							"error",
						);
					}
				} catch (error) {
					console.error("Ошибка при распаковке архива:", error);
					showToast(
						"Ошибка при распаковке архива. Проверьте, что файл не поврежден.",
						"error",
					);
				}
			}

			// Загрузка найденной модели
			if (modelFile) {
				// Clean up previous object URL if exists
				if (modelUrl) URL.revokeObjectURL(modelUrl);

				const url = URL.createObjectURL(modelFile);
				setModelUrl(url);
				setIsLoading(true);
				setHasModel(true);

				// Reset model states
				resetModelState();

				console.log(
					`Загружена модель: ${modelFile.name}, размер: ${(modelFile.size / 1024 / 1024).toFixed(2)} МБ`,
				);
			}

			// Загрузка найденных инструкций
			if (instructionFile) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const jsonData = JSON.parse(e.target?.result as string);
						// Check if it has the expected structure
						if (
							jsonData.assemblyStages &&
							Array.isArray(jsonData.assemblyStages)
						) {
							setInstructions(jsonData.assemblyStages);
							setHasInstructions(true);
							setCurrentStep(0); // Start at step 0 (full model view)
							console.log(
								`Загружены инструкции: ${instructionFile?.name}, шагов: ${jsonData.assemblyStages.length}`,
							);
						} else {
							showToast("Формат инструкции не распознан", "error");
							setInstructions([]);
							setHasInstructions(false);
						}
					} catch (error) {
						console.error("Error parsing JSON:", error);
						showToast("Ошибка при чтении файла инструкции", "error");
					}
				};
				reader.readAsText(instructionFile);
			}

			if (!modelFile && !instructionFile && !zipFile) {
				showToast(
					"Не найдено ни моделей (.glb/.gltf), ни инструкций (.json), ни архивов (.zip)",
					"error",
				);
			}
		},
		[modelUrl, resetModelState, setModelUrl, showToast],
	);

	// Handle instruction file upload
	const handleInstructionUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const jsonData = JSON.parse(e.target?.result as string);
						// Check if it has the expected structure
						if (
							jsonData.assemblyStages &&
							Array.isArray(jsonData.assemblyStages)
						) {
							setInstructions(jsonData.assemblyStages);
							setHasInstructions(true);
							setCurrentStep(0);
						} else {
							showToast("Формат инструкции не распознан", "error");
							setInstructions([]);
							setHasInstructions(false);
						}
					} catch (error) {
						console.error("Error parsing JSON:", error);
						showToast("Ошибка при чтении файла инструкции", "error");
					}
				};
				reader.readAsText(file);
			}
		},
		[showToast],
	);

	// Handle changes to visible parts based on instructions
	const handleVisibilityChange = useCallback(
		(newVisibleParts: Record<string, boolean>) => {
			// Completely replace the visible parts instead of merging
			setVisibleParts(newVisibleParts);
		},
		[setVisibleParts],
	);

	// Reset the view and camera
	const resetView = useCallback(() => {
		setSelectedParts([]);
		if (controlsRef.current) {
			controlsRef.current.object.position.set(...DEFAULT_CAMERA_POSITION);
			controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET);
			controlsRef.current.reset();
			controlsRef.current.update();
		}
	}, [setSelectedParts]);

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
	}, [modelParts, currentStep, setVisibleParts]);

	// Clean up object URL on unmount
	useEffect(() => {
		return () => {
			if (modelUrl) URL.revokeObjectURL(modelUrl);
		};
	}, [modelUrl]);

	// Memoize the 3D scene to prevent unnecessary re-renders
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
				<color attach="background" args={["#E2E8F0"]} />

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
							onLoad={handleModelLoad}
							onPartFound={handlePartFound}
						/>
					</Stage>
				</Suspense>

				<OrbitControls
					ref={controlsRef}
					makeDefault
					autoRotate={selectedParts.length === 0}
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
			handleModelLoad,
			handlePartFound,
			selectedParts,
			showStats,
			dpr,
			activeProfile,
			profiles,
			adaptiveDprEnabled,
			handlePerformanceChange,
		],
	);

	// Determine if we should show the viewer or uploader
	const showViewer = hasModel && modelUrl && hasInstructions;

	return (
		<div className="w-full h-screen relative bg-gradient-to-br from-slate-100 to-slate-200">
			{!showViewer && (
				<StartPage
					onModelUpload={handleModelUpload}
					onInstructionUpload={handleInstructionUpload}
					onMultiUpload={handleMultiUpload}
					hasModel={hasModel}
					hasInstructions={hasInstructions}
				/>
			)}

			{showViewer && (
				<>
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

					{hasInstructions && instructions.length > 0 && (
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
							/>
						</Widget>
					)}

					<button
						type="button"
						onClick={() => {
							if (modelUrl) URL.revokeObjectURL(modelUrl);
							setModelUrl(null);
							setInstructions([]);
							setHasInstructions(false);
							setHasModel(false);
							resetModelState();
						}}
						className="absolute bottom-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 z-10 flex items-center gap-2"
					>
						<MdKeyboardArrowLeft size={20} title="Back" />
						Загрузить другую модель
					</button>

					{Scene3D}
				</>
			)}

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
