import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, visibleParts, onLoad, onPartFound }) {
  const { scene } = useGLTF(url, true);
  const initialized = useRef(false);
  const meshRefs = useRef({});

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        
        if (child.material) {
          child.material.side = THREE.FrontSide;
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
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!initialized.current) {
      const parts = {};
      
      const getFullPath = (object) => {
        const path = [];
        let current = object;
        while (current && current !== scene) {
          path.unshift(current.name || `unnamed_${current.type}`);
          current = current.parent;
        }
        return path.join(' / ');
      };

      scene.traverse((child) => {
        if (child.isMesh) {
          const fullPath = getFullPath(child);
          const name = fullPath || `Part_${Object.keys(parts).length + 1}`;
          child.name = name;
          parts[name] = true;
          meshRefs.current[name] = child;
        }
      });
      onLoad(parts);
      onPartFound(meshRefs.current);
      initialized.current = true;
    }
  }, [scene, onLoad, onPartFound]);

  useEffect(() => {
    if (visibleParts && Object.keys(visibleParts).length > 0) {
      Object.entries(meshRefs.current).forEach(([name, mesh]) => {
        if (visibleParts.hasOwnProperty(name)) {
          mesh.visible = visibleParts[name];
        }
      });
    }
  }, [visibleParts]);

  return <primitive object={scene} />;
}

export default Model; 