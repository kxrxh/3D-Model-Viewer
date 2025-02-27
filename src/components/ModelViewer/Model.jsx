import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, visibleParts, onLoad, onPartFound }) {
  const { scene } = useGLTF(url, true);
  const initialized = useRef(false);
  const meshToPath = useRef({});

  // Apply material and geometry settings to meshes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.side = THREE.DoubleSide;
        child.material.depthWrite = true;
        child.material.depthTest = true;
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = 1;
        child.material.polygonOffsetUnits = 1;
        child.material.needsUpdate = true;
      }
      if (child.geometry) {
        child.geometry.computeBoundingSphere();
        child.geometry.computeBoundingBox();
      }
      child.renderOrder = 0;
    });
  }, [scene]);

  // Initialize model: map meshes to paths and find groups
  useEffect(() => {
    if (!initialized.current) {
      const parts = {};
      meshToPath.current = {};

      // Function to get the full path of an object (based on parent hierarchy)
      const getFullPath = (object) => {
        const path = [];
        let current = object;
        while (current && current !== scene) {
          if (!current.isMesh) {
            path.unshift(current.name || `unnamed_${current.type}`);
          }
          current = current.parent;
        }
        return path.join(' / ').trim();
      };

      // Map each mesh to its full path and collect parts
      scene.traverse((child) => {
        if (child.isMesh) {
          const fullPath = getFullPath(child.parent);
          if (fullPath) {
            meshToPath.current[child.uuid] = fullPath;
            if (!parts[fullPath]) {
              parts[fullPath] = true;
            }
          }
        }
      });

      // Function to find a group in the scene by its full path
      const findGroupByPath = (scene, path) => {
        const parts = path.split(' / ');
        let current = scene;
        for (const part of parts) {
          const child = current.children.find(
            (child) => child.name === part && child.isGroup
          );
          if (!child) return null;
          current = child;
        }
        return current;
      };

      // Create meshRefs with actual groups from the scene
      const meshRefs = {};
      Object.keys(parts).forEach((path) => {
        const group = findGroupByPath(scene, path);
        if (group) {
          meshRefs[path] = group;
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
      if (child.isMesh) {
        const fullPath = meshToPath.current[child.uuid];
        if (fullPath) {
          child.visible = visibleParts[fullPath] !== false;
        } else {
          child.visible = true; // Default to visible if no path
        }
      }
    });
  }, [visibleParts, scene]);

  return <primitive object={scene} />;
}

export default Model;