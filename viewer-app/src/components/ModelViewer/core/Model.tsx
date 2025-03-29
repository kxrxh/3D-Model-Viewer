import { useRef, useEffect, useCallback } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelProps {
	url: string;
	visibleParts: Record<string, boolean>;
	currentStepParts?: string[];
	highlightColor?: string;
	highlightEnabled?: boolean;
	previousStepsTransparency?: boolean;
	previousStepsOpacity?: number;
	onLoad: (parts: Record<string, boolean>) => void;
	onPartFound: (meshRefs: Record<string, THREE.Mesh>) => void;
}

function Model({
	url,
	visibleParts,
	currentStepParts = [],
	highlightColor = "#f87171",
	highlightEnabled = true,
	previousStepsTransparency = false,
	previousStepsOpacity = 0.4,
	onLoad,
	onPartFound,
}: ModelProps) {
	const { scene } = useGLTF(url, true);
	const initialized = useRef(false);
	const meshToPath = useRef<Record<string, string>>({});
	const originalMaterials = useRef<
		Map<THREE.Mesh, THREE.Material | THREE.Material[]>
	>(new Map());

	// Apply material and geometry settings to meshes
	useEffect(() => {
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh && child.material) {
				// Store original materials for later restoration
				if (!originalMaterials.current.has(child)) {
					originalMaterials.current.set(child, child.material.clone());
				}

				child.material.side = THREE.DoubleSide;
				child.material.depthWrite = true;
				child.material.depthTest = true;
				child.material.polygonOffset = true;
				child.material.polygonOffsetFactor = 1;
				child.material.polygonOffsetUnits = 1;
				child.material.needsUpdate = true;
			}
			if (child instanceof THREE.Mesh && child.geometry) {
				child.geometry.computeBoundingSphere();
				child.geometry.computeBoundingBox();
			}
			child.renderOrder = 0;
		});
	}, [scene]);

	// Initialize model: map meshes to paths and find groups/meshes
	useEffect(() => {
		if (!initialized.current) {
			const parts: Record<string, boolean> = {};
			meshToPath.current = {};

			// Function to get the full path of an object (based on parent hierarchy)
			const getFullPath = (object: THREE.Object3D) => {
				const path: string[] = [];
				let current: THREE.Object3D | null = object;
				while (current && current !== scene) {
					if (!(current instanceof THREE.Mesh)) {
						// Only include group names in the path
						path.unshift(current.name || `unnamed_${current.type}`);
					}
					current = current.parent;
				}
				return path.join(" / ").trim();
			};

			// Map each mesh to its full path and collect parts
			const meshRefs: Record<string, THREE.Mesh> = {};
			scene.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					const parent = child.parent;
					const fullPath = parent ? getFullPath(parent) : "";
					if (fullPath) {
						meshToPath.current[child.uuid] = fullPath;
						parts[fullPath] = true;
						// Store the mesh itself under the path, not just the group
						if (!meshRefs[fullPath]) {
							meshRefs[fullPath] = child;
						}
					} else {
						// Handle root-level meshes (no parent groups)
						const meshPath = child.name || `mesh_${child.uuid}`;
						meshToPath.current[child.uuid] = meshPath;
						parts[meshPath] = true;
						meshRefs[meshPath] = child;
					}
				}
			});

			onLoad(parts);
			onPartFound(meshRefs);
			initialized.current = true;
		}
	}, [scene, onLoad, onPartFound]);

	// Функция для проверки, поддерживает ли материал цвет и эмиссию
	const applyColorToMaterial = useCallback((
		material: THREE.Material,
		color: THREE.Color,
		emissiveIntensity = 0.2
	) => {
		// Проверяем, является ли материал типом, поддерживающим свойство color
		if (
			material instanceof THREE.MeshStandardMaterial ||
			material instanceof THREE.MeshPhongMaterial ||
			material instanceof THREE.MeshLambertMaterial ||
			material instanceof THREE.MeshBasicMaterial
		) {
			material.color.copy(color);

			// Проверяем поддержку эмиссии
			if ('emissive' in material && material.emissive instanceof THREE.Color) {
				material.emissive.copy(color.clone().multiplyScalar(emissiveIntensity));
			}
		}
		
		// Для любого типа материала
		if (material.transparent !== undefined) {
			material.transparent = false;
		}
		if (material.opacity !== undefined) {
			material.opacity = 1.0;
		}
	}, []);

	// Функция для применения прозрачности к материалу
	const applyTransparencyToMaterial = useCallback((
		material: THREE.Material,
		opacity: number
	) => {
		if (material.transparent !== undefined) {
			material.transparent = true;
		}
		if (material.opacity !== undefined) {
			material.opacity = opacity;
		}
		if (material.depthWrite !== undefined) {
			material.depthWrite = true;
		}
	}, []);

	// Update visibility and highlight current step parts
	useEffect(() => {
		// Преобразуем цвет из HEX в THREE.Color
		const highlightThreeColor = new THREE.Color(highlightColor);

		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				const fullPath = meshToPath.current[child.uuid];
				if (fullPath) {
					// Устанавливаем видимость на основе visibleParts
					child.visible = visibleParts[fullPath] !== false;

					if (child.visible) {
						// Проверяем, является ли деталь частью текущего шага
						const isCurrentStepPart = currentStepParts.includes(fullPath);

						// Получаем оригинальный материал
						const originalMaterial = originalMaterials.current.get(child);

						if (originalMaterial) {
							// Create a new material to work with
							let newMaterial: THREE.Material | THREE.Material[];
							if (Array.isArray(originalMaterial)) {
								// For meshes with multiple materials
								newMaterial = originalMaterial.map((mat) => mat.clone());
							} else {
								// For meshes with a single material
								newMaterial = originalMaterial.clone();
							}

							// Apply highlight to current step parts if enabled
							if (isCurrentStepPart && highlightEnabled) {
								if (Array.isArray(newMaterial)) {
									for (const mat of newMaterial) {
										applyColorToMaterial(mat, highlightThreeColor);
									}
								} else {
									applyColorToMaterial(newMaterial, highlightThreeColor);
								}
							}
							// Apply transparency to previous steps if enabled
							else if (
								!isCurrentStepPart &&
								previousStepsTransparency &&
								currentStepParts.length > 0
							) {
								if (Array.isArray(newMaterial)) {
									for (const mat of newMaterial) {
										applyTransparencyToMaterial(mat, previousStepsOpacity);
									}
								} else {
									applyTransparencyToMaterial(newMaterial, previousStepsOpacity);
								}
							}

							// Apply the new material
							child.material = newMaterial;
						}
					}
				} else {
					child.visible = true; // Default for unmapped meshes
				}
			}
		});
	}, [
		visibleParts,
		currentStepParts,
		highlightColor,
		highlightEnabled,
		previousStepsTransparency,
		previousStepsOpacity,
		scene,
		applyColorToMaterial,
		applyTransparencyToMaterial
	]);

	return <primitive object={scene} />;
}

export default Model;
