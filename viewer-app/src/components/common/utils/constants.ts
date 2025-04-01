import * as THREE from "three";

// Camera defaults
export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 2, 5];
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 0, 0];

// THREE.js specific settings
export const ENABLE_THREE_CACHE = true;

// Apply global THREE.js settings
if (ENABLE_THREE_CACHE) {
	THREE.Cache.enabled = true;
}

export const DEFAULT_HIGHLIGHT_COLOR = "#f87171"; // Light red
export const DEFAULT_PREVIOUS_STEPS_OPACITY = 0.4; // 40%
export const DEFAULT_BACKGROUND_COLOR = "#E2E8F0"; // Light slate gray
