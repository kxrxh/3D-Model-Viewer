import * as THREE from "three";

// Camera defaults
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [5, 5, 5];
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0];

// THREE.js specific settings
export const ENABLE_THREE_CACHE = true;

// Apply global THREE.js settings
if (ENABLE_THREE_CACHE) {
	THREE.Cache.enabled = true;
}
