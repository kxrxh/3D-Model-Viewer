import { useState, useRef, useCallback } from "react";
import type * as THREE from "three";

export function useModelState() {
	const [modelParts, setModelParts] = useState<Record<string, boolean>>({});
	const [visibleParts, setVisibleParts] = useState<Record<string, boolean>>({});
	const [currentStepParts, setCurrentStepParts] = useState<string[]>([]);
	const [meshes, setMeshes] = useState<Record<string, THREE.Mesh>>({});
	const [selectedParts, setSelectedParts] = useState<THREE.Mesh[]>([]);
	const [modelUrl, setModelUrl] = useState<string | null>(null);
	const isInitialized = useRef(false);

	const resetModelState = useCallback(() => {
		isInitialized.current = false;
		setModelParts({});
		setVisibleParts({});
		setCurrentStepParts([]);
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
		currentStepParts,
		setCurrentStepParts,
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
