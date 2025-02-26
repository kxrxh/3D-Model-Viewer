import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, visibleParts, onLoad, onPartFound }) {
  const { scene } = useGLTF(url, true);
  const initialized = useRef(false);
  const meshRefs = useRef({});

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.side = THREE.DoubleSide; // Render both front and back faces
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

  useEffect(() => {
    if (!initialized.current) {
      const parts = {};
      
      const getFullPath = (object) => {
        const path = [];
        let current = object;
        while (current && current !== scene) {
          const name = current.name || `unnamed_${current.type}`;
          // Skip adding mesh names to the path
          if (!current.isMesh) {
            path.unshift(name);
          }
          current = current.parent;
        }
        return path.join(' / ').trim() || `Part_${Object.keys(parts).length + 1}`;
      };

      // Create a hierarchical structure for parts
      const hierarchy = {};
      scene.traverse((child) => {
        if (child.isMesh) {
          const fullPath = getFullPath(child.parent);  // Use parent's path instead
          if (fullPath) {
            const pathParts = fullPath.split(' / ');
            
            // Create groups for each level of hierarchy
            let currentPath = '';
            let currentHierarchy = hierarchy;
            
            pathParts.forEach((part, index) => {
              currentPath = currentPath ? `${currentPath} / ${part}` : part;
              
              if (!currentHierarchy[part]) {
                currentHierarchy[part] = {
                  group: new THREE.Group(),
                  children: {},
                  fullPath: currentPath
                };
                currentHierarchy[part].group.name = currentPath;
              }
              
              // Add mesh to the current group
              if (index === pathParts.length - 1) {
                const clonedMesh = child.clone();
                clonedMesh.visible = true;
                currentHierarchy[part].group.add(clonedMesh);
              }
              
              currentHierarchy = currentHierarchy[part].children;
            });
            
            parts[fullPath] = true;
          }
        }
      });

      // Function to process the hierarchy and add groups to meshRefs
      const processHierarchy = (hierarchyObj, parentPath = '') => {
        Object.entries(hierarchyObj).forEach(([name, data]) => {
          const fullPath = data.fullPath;
          meshRefs.current[fullPath] = data.group;
          
          // Process children recursively
          processHierarchy(data.children, fullPath);
        });
      };

      processHierarchy(hierarchy);

      // Also store individual meshes under their full paths if not part of a group
      scene.traverse((child) => {
        if (child.isMesh && !meshRefs.current[child.name]) {
          meshRefs.current[child.name] = child;
        }
      });

      onLoad(parts);
      onPartFound(meshRefs.current);
      initialized.current = true;
    }
  }, [scene, onLoad, onPartFound]);

  useEffect(() => {
    if (visibleParts && Object.keys(visibleParts).length > 0) {
      Object.entries(meshRefs.current).forEach(([name, object]) => {
        const shouldBeVisible = visibleParts[name];
        
        if (object.isMesh) {
          object.visible = shouldBeVisible;
        } else if (object.isGroup) {
          object.traverse((child) => {
            if (child.isMesh) {
              child.visible = shouldBeVisible;
            }
          });
        }
      });
    } else {
      // If no visibility state is provided, make everything visible
      Object.values(meshRefs.current).forEach((object) => {
        if (object.isMesh) {
          object.visible = true;
        } else if (object.isGroup) {
          object.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;
            }
          });
        }
      });
    }
  }, [visibleParts]);

  return <primitive object={scene} />;
}

export default Model;