import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function PartFocusController({ selectedParts, controls }) {
  const { camera } = useThree();

  useEffect(() => {
    if (selectedParts.length > 0 && controls.current) {
      const box = new THREE.Box3();
      selectedParts.forEach((part) => {
        if (part) box.expandByObject(part);
      });
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      controls.current.target.copy(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = maxDim / 2 / Math.tan(fov / 2) * 1.5;
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.current.target)
        .normalize();
      const newPosition = center.clone().add(direction.multiplyScalar(cameraDistance));
      camera.position.copy(newPosition);
      controls.current.update();
    }
  }, [selectedParts, camera, controls]);

  return null;
} 