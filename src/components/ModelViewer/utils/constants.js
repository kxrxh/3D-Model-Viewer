import * as THREE from 'three';

// Enable THREE.js cache
THREE.Cache.enabled = true;

// Camera settings
export const DEFAULT_CAMERA_POSITION = [5, 5, 5];
export const DEFAULT_CAMERA_TARGET = [0, 0, 0];

// Performance settings
export const MIN_DPR = 1;
export const MAX_DPR = window.devicePixelRatio || 2; 