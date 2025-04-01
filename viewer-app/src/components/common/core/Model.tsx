import { useRef, useEffect } from "react";
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
	// Preload the model to ensure it's loaded before rendering
	useGLTF.preload(url);

	// Load the model with error handling
	const { scene } = useGLTF(url, true, undefined, (error) => {
		console.error("Error loading model:", error);
	});

	const initialized = useRef(false);
	const meshToPath = useRef<Record<string, string>>({});
	const originalMaterials = useRef<
		Map<THREE.Mesh, THREE.Material | THREE.Material[]>
	>(new Map());

	// Apply material and geometry settings to meshes
	useEffect(() => {
		console.log('Model: Initializing materials');
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh && child.material) {
				// Store original materials for later restoration
				if (!originalMaterials.current.has(child)) {
					console.log(`Model: Storing original material for ${child.name || child.uuid}`);
					const material =
						child.material instanceof THREE.Material
							? child.material
							: Array.isArray(child.material)
								? child.material[0]
								: null;

					if (material?.map) {
						material.map.flipY = false;
						material.map.premultiplyAlpha = false;
						material.map.needsUpdate = true;
					}

					originalMaterials.current.set(child, child.material.clone());
				}

				// Apply material settings
				if (child.material instanceof THREE.Material) {
					child.material.side = THREE.DoubleSide;
					child.material.depthWrite = true;
					child.material.depthTest = true;
					child.material.polygonOffset = true;
					child.material.polygonOffsetFactor = 1;
					child.material.polygonOffsetUnits = 1;
					child.material.needsUpdate = true;
				} else if (Array.isArray(child.material)) {
					for (const mat of child.material) {
						mat.side = THREE.DoubleSide;
						mat.depthWrite = true;
						mat.depthTest = true;
						mat.polygonOffset = true;
						mat.polygonOffsetFactor = 1;
						mat.polygonOffsetUnits = 1;
						mat.needsUpdate = true;
					}
				}
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
			console.log('Model: Initializing mesh paths');
			const parts: Record<string, boolean> = {};
			meshToPath.current = {};

			// Function to get the full path of an object (based on parent hierarchy)
			const getFullPath = (object: THREE.Object3D | null): string => {
				const path: string[] = [];
				let current = object;
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
					const fullPath = getFullPath(child.parent);
					if (fullPath) {
						meshToPath.current[child.uuid] = fullPath;
						parts[fullPath] = true;
						// Store the mesh itself under the path, not just the group
						if (!meshRefs[fullPath]) {
							meshRefs[fullPath] = child; // Reference the mesh directly
						}
						console.log(`Model: Mapped mesh ${child.uuid} to path ${fullPath}`);
					} else {
						// Handle root-level meshes (no parent groups)
						const meshPath = child.name || `mesh_${child.uuid}`;
						meshToPath.current[child.uuid] = meshPath;
						parts[meshPath] = true;
						meshRefs[meshPath] = child;
						console.log(`Model: Mapped root mesh ${child.uuid} to path ${meshPath}`);
					}
				}
			});

			onLoad(parts);
			onPartFound(meshRefs);
			initialized.current = true;
		}
	}, [scene, onLoad, onPartFound]);

	// Update visibility and materials of meshes based on current state
	useEffect(() => {
		console.log('Model: Updating materials and visibility');
		console.log('Model: Current step parts:', currentStepParts);
		console.log('Model: Highlight enabled:', highlightEnabled);
		console.log('Model: Highlight color:', highlightColor);
		
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				const fullPath = meshToPath.current[child.uuid];
				if (fullPath) {
					// Determine if this part is in the current step
					const isInCurrentStep = currentStepParts.includes(fullPath);
					// Determine if this part should be visible
					const isVisible = visibleParts[fullPath] !== false;

					console.log(`Model: Processing mesh ${fullPath}:`, {
						isInCurrentStep,
						isVisible,
						hasMaterial: !!child.material
					});

					// Set visibility
					child.visible = isVisible;

					if (isVisible) {
						// Get the original material
						const originalMaterial = originalMaterials.current.get(child);
						if (!originalMaterial) {
							console.log(`Model: No original material found for ${fullPath}`);
							return;
						}

						// Clone the original material to avoid modifying it
						let material: THREE.Material;
						if (Array.isArray(originalMaterial)) {
							material = originalMaterial[0].clone();
						} else {
							material = originalMaterial.clone();
						}

						// Configure material textures
						if (
							material instanceof THREE.MeshStandardMaterial &&
							material.map
						) {
							material.map.flipY = false;
							material.map.premultiplyAlpha = false;
							material.map.needsUpdate = true;
						}

						// Apply highlight if enabled and part is in current step
						if (
							highlightEnabled &&
							isInCurrentStep &&
							material instanceof THREE.MeshStandardMaterial
						) {
							console.log(`Model: Applying highlight to ${fullPath}`);
							material.color.set(highlightColor);
							material.emissive.set(highlightColor).multiplyScalar(0.2);
						}

						// Apply transparency if enabled and part is from previous steps
						if (
							previousStepsTransparency &&
							!isInCurrentStep &&
							currentStepParts.length > 0
						) {
							material.transparent = true;
							material.opacity = previousStepsOpacity;
						}

						// Apply the modified material
						child.material = material;
					}
				} else {
					child.visible = true; // Default for unmapped meshes
				}
			}
		});
	}, [
		visibleParts,
		scene,
		currentStepParts,
		highlightColor,
		highlightEnabled,
		previousStepsTransparency,
		previousStepsOpacity,
	]);

	// Clean up resources when unmounting
	useEffect(() => {
		return () => {
			// Clean up materials
			for (const [, material] of originalMaterials.current) {
				if (Array.isArray(material)) {
					for (const m of material) {
						m.dispose();
					}
				} else {
					material.dispose();
				}
			}
			originalMaterials.current.clear();

			// Clean up geometries and materials from the scene
			scene.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					if (child.geometry) {
						child.geometry.dispose();
					}
					if (child.material) {
						if (Array.isArray(child.material)) {
							for (const material of child.material) {
								material.dispose();
							}
						} else {
							child.material.dispose();
						}
					}
				}
			});
		};
	}, [scene]);

	return <primitive object={scene} />;
}

export default Model;
