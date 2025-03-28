import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelProps {
	url: string;
	visibleParts: Record<string, boolean>;
	currentStepParts?: string[];
	highlightColor?: string;
	highlightEnabled?: boolean;
	onLoad: (parts: Record<string, boolean>) => void;
	onPartFound: (meshRefs: Record<string, THREE.Mesh>) => void;
}

function Model({ 
	url, 
	visibleParts, 
	currentStepParts = [], 
	highlightColor = "#f87171", 
	highlightEnabled = true,
	onLoad, 
	onPartFound 
}: ModelProps) {
	const { scene } = useGLTF(url, true);
	const initialized = useRef(false);
	const meshToPath = useRef<Record<string, string>>({});
	const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

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
						
						if (isCurrentStepPart && highlightEnabled && originalMaterial) {
							// Применяем подсветку для деталей текущего шага
							// Клонируем оригинальный материал для безопасного изменения
							if (Array.isArray(child.material)) {
								// Для meshes с несколькими материалами
								child.material = child.material.map(mat => {
									const highlightedMaterial = mat.clone();
									highlightedMaterial.color = highlightThreeColor;
									highlightedMaterial.emissive = highlightThreeColor.clone().multiplyScalar(0.2);
									return highlightedMaterial;
								});
							} else {
								// Для meshes с одним материалом
								const highlightedMaterial = child.material.clone();
								highlightedMaterial.color = highlightThreeColor;
								highlightedMaterial.emissive = highlightThreeColor.clone().multiplyScalar(0.2);
								child.material = highlightedMaterial;
							}
						} else if (originalMaterial) {
							// Восстанавливаем оригинальный материал для деталей, которые не в текущем шаге
							// или если подсветка отключена
							if (Array.isArray(originalMaterial)) {
								// Для meshes с несколькими материалами
								child.material = originalMaterial.map(mat => mat.clone());
							} else {
								// Для meshes с одним материалом
								child.material = originalMaterial.clone();
							}
						}
					}
				} else {
					child.visible = true; // Default for unmapped meshes
				}
			}
		});
	}, [visibleParts, currentStepParts, highlightColor, highlightEnabled, scene]);

	return <primitive object={scene} />;
}

export default Model;
