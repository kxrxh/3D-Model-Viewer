import type * as THREE from "three";

export interface ModelState {
	modelParts: Record<string, boolean>;
	visibleParts: Record<string, boolean>;
	setVisibleParts: (parts: Record<string, boolean>) => void;
	currentStepParts: string[];
	setCurrentStepParts: (parts: string[]) => void;
	meshes: Record<string, THREE.Mesh>;
	selectedParts: THREE.Mesh[];
	setSelectedParts: (parts: THREE.Mesh[]) => void;
	modelUrl: string | null;
	setModelUrl: (url: string | null) => void;
	resetModelState: () => void;
	handleModelLoad: (parts: Record<string, boolean>) => void;
	handlePartFound: (meshRefs: Record<string, THREE.Mesh>) => void;
}
