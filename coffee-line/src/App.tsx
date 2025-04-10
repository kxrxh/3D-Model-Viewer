import { Suspense, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import "./App.css";

interface ModelProps {
	url: string;
}

function Model({ url }: ModelProps) {
	const { scene } = useGLTF(url) as { scene: THREE.Group };

	// Rotate the model
	useFrame((state) => {
		const time = state.clock.getElapsedTime();
		scene.rotation.y = time * 0.2;
	});

	return <primitive object={scene} scale={1.5} />;
}

function Loader() {
	return (
		<Html center>
			<div className="loader">
				<div className="loading-spinner" />
				<p>Загрузка модели...</p>
			</div>
		</Html>
	);
}

function ErrorDisplay() {
	return (
		<Html center>
			<div className="error-display">
				<span className="error-icon">⚠️</span>
				<p>Error loading the model</p>
				<p>Please try a different model</p>
			</div>
		</Html>
	);
}

// Clear the GLB model cache when changing models
useGLTF.preload("/coffeeLine/green.glb");
useGLTF.preload("/coffeeLine/green_2.glb");
useGLTF.preload("/coffeeLine/roasted.glb");
useGLTF.preload("/coffeeLine/roasted_2.glb");
useGLTF.preload("/coffeeLine/green_roasted.glb");
useGLTF.preload("/coffeeLine/green_roasted_2.glb");
useGLTF.preload("/coffeeLine/green_roasted_3.glb");

function App() {
	const [modelUrl, setModelUrl] = useState<string>("");
	const [showModelSelection, setShowModelSelection] = useState<boolean>(true);
	const [modelError, setModelError] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const availableModels = [
		{ name: "Зеленый", path: "/coffeeLine/green.glb", id: "green" },
		{ name: "Зеленый 2", path: "/coffeeLine/green_2.glb", id: "green2" },
		{ name: "Жареный", path: "/coffeeLine/roasted.glb", id: "roasted" },
		{ name: "Жареный 2", path: "/coffeeLine/roasted_2.glb", id: "roasted2" },
		{
			name: "Зеленый+Жареный",
			path: "/coffeeLine/green_roasted.glb",
			id: "green-roasted",
		},
		{
			name: "Зеленый+Жареный2",
			path: "/coffeeLine/green_roasted_2.glb",
			id: "green-roasted2",
		},
		{
			name: "Зеленый+Жареный3",
			path: "/coffeeLine/green_roasted_3.glb",
			id: "green-roasted3",
		},
	];

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file?.name.endsWith(".glb")) {
			const url = URL.createObjectURL(file);
			setModelUrl(url);
			setShowModelSelection(false);
			setModelError(false);
		} else {
			alert("Пожалуйста, выберите валидный GLB файл");
		}
	};

	const selectModel = (path: string) => {
		// Clear the cache for the previously used model
		if (modelUrl) {
			useGLTF.clear(modelUrl);
		}

		setModelUrl(path);
		setShowModelSelection(false);
		setModelError(false);
	};

	const handleModelKeyPress = (e: React.KeyboardEvent, path: string) => {
		if (e.key === "Enter" || e.key === " ") {
			selectModel(path);
		}
	};

	return (
		<div className="app-container">
			{showModelSelection ? (
				<div className="model-selection-screen">
					<h1>Выберите 3D модель</h1>
					<div className="model-grid">
						{availableModels.map((model) => (
							<div
								key={model.id}
								className="model-item"
								onClick={() => selectModel(model.path)}
								onKeyDown={(e) => handleModelKeyPress(e, model.path)}
								aria-label={`Load ${model.name} model`}
							>
								<div className="model-thumbnail">
									<span className="model-icon">📦</span>
								</div>
								<p className="model-name">{model.name}</p>
							</div>
						))}
					</div>
				</div>
			) : (
				<>
					<div className="controls">
						<div className="buttons-container">
							<button
								className=""
								type="button"
								onClick={() => {
									// Clear the cache when returning to model selection
									if (modelUrl) {
										useGLTF.clear(modelUrl);
									}
									setShowModelSelection(true);
								}}
							>
								Выбрать другую модель
							</button>
							<input
								type="file"
								accept=".glb"
								onChange={handleFileChange}
								ref={fileInputRef}
								style={{ display: "none" }}
							/>
						</div>
					</div>

					<div className="canvas-container">
						<Canvas
							camera={{ position: [0, 0, 5], fov: 45 }}
							onCreated={({ gl }) => {
								gl.setClearColor(new THREE.Color("#1a1a1a"));
							}}
						>
							<ambientLight intensity={0.5} />
							<pointLight position={[10, 10, 10]} intensity={1} />
							{modelUrl && (
								<Suspense fallback={<Loader />}>
									{modelError ? (
										<ErrorDisplay />
									) : (
										<>
											<Model url={modelUrl} />
											<Environment preset="city" />
										</>
									)}
									<OrbitControls
										enableZoom={true}
										enablePan={true}
										enableRotate={true}
										autoRotate={false}
										makeDefault
									/>
								</Suspense>
							)}
						</Canvas>
					</div>
				</>
			)}
		</div>
	);
}

export default App;
