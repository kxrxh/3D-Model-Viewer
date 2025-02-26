import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const CameraController = React.memo(({ target }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (controls) {
      if (target) {
        controls.autoRotate = false;

        const box = new THREE.Box3().setFromObject(target);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const minSize = 0.1;
        const maxDim = Math.max(
          Math.max(size.x, minSize),
          Math.max(size.y, minSize),
          Math.max(size.z, minSize)
        );
        
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.5;
        cameraZ = Math.max(cameraZ, maxDim * 2);

        const direction = new THREE.Vector3(1, 1, 1).normalize();
        const position = center.clone().add(direction.multiplyScalar(cameraZ));

        controls.target.copy(center);
        camera.position.copy(position);
        
        controls.minDistance = maxDim;
        controls.maxDistance = maxDim * 10;
      } else {
        controls.autoRotate = true;
        controls.target.set(0, 0, 0);
        camera.position.set(5, 5, 5);
        controls.minDistance = 2;
        controls.maxDistance = 20;
      }
      
      controls.update();
    }
  }, [target, camera, controls]);

  return null;
});

export default CameraController; 