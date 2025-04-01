import { useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface PartFocusControllerProps {
	selectedParts: THREE.Mesh[];
	controls: React.RefObject<OrbitControlsImpl | null>;
}

const PartFocusController = ({
	selectedParts,
	controls,
}: PartFocusControllerProps) => {
	useEffect(() => {
		if (selectedParts.length > 0 && controls.current) {
			const box = new THREE.Box3();
			const center = new THREE.Vector3();
			const size = new THREE.Vector3();

			// Compute bounding box for all selected parts
			for (const part of selectedParts) {
				if (!part.geometry.boundingBox) {
					part.geometry.computeBoundingBox();
				}
				const partBox = part.geometry.boundingBox?.clone();
				if (partBox) {
					partBox.applyMatrix4(part.matrixWorld);
					box.union(partBox);
				}
			}

			// Get center and size
			box.getCenter(center);
			box.getSize(size);

			// Calculate camera position and target
			const maxDim = Math.max(size.x, size.y, size.z);
			const distance = maxDim * 10.0;

			// Set target to center of bounding box
			if (
				controls.current.target &&
				typeof controls.current.update === "function"
			) {
				controls.current.target.copy(center);

				// Use distance to position camera properly
				const direction = new THREE.Vector3()
					.subVectors(controls.current.object.position, center)
					.normalize();

				controls.current.object.position.copy(
					center.clone().add(direction.multiplyScalar(distance)),
				);

				controls.current.update();
			}
		}
	}, [selectedParts, controls]);

	return null;
};

export default PartFocusController;
