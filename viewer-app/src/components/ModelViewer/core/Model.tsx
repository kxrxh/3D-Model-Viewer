import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelProps {
	url: string;
	visibleParts: Record<string, boolean>;
	onLoad: (parts: Record<string, boolean>) => void;
	onPartFound: (meshRefs: Record<string, THREE.Mesh>) => void;
}

function Model({ url, visibleParts, onLoad, onPartFound }: ModelProps) {
	const { scene } = useGLTF(url, true);
	const initialized = useRef(false);
	const meshToPath = useRef<Record<string, string>>({});

	// Apply material and geometry settings to meshes
	useEffect(() => {
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh && child.material) {
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

	// Update visibility of original meshes based on visibleParts
	useEffect(() => {
		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				const fullPath = meshToPath.current[child.uuid];
				if (fullPath) {
					child.visible = visibleParts[fullPath] !== false;
				} else {
					child.visible = true; // Default for unmapped meshes
				}
			}
		});
	}, [visibleParts, scene]);

	return <primitive object={scene} />;
}

export default Model;
