import * as THREE from 'three'

class CameraController {

	static CameraMode = {
		None: 0,
		FirstPersonCamera: 1,
		ThirdPersonCamera: 3,
	}

	constructor(target, camera) {
		this.target = target;
		this.camera = camera;

		this.currentPosition = new THREE.Vector3()
		this.currentLookat = new THREE.Vector3()
	}

	calculateIdealOffset(distance, height) {
		const idealOffset = new THREE.Vector3();
		this.target.getWorldDirection(idealOffset);
		idealOffset.multiplyScalar(distance);
		idealOffset.add(this.target.position);
		idealOffset.y = height;
		return idealOffset
	}

	calculateIdealLookat(x, y, z) {
		const idealLookat = new THREE.Vector3(x, y, z);
		idealLookat.add(this.target.position);
		return idealLookat
	}

	update(deltaTime, cameraMode) {
		const idealOffset = this.calculateIdealOffset(-3, 2);
		const idealLookat = this.calculateIdealLookat(0, 0, 0);

		const alpha = 1.0 - Math.pow(0.001, deltaTime);

		this.currentPosition.lerp(idealOffset, alpha);
		this.currentLookat.lerp(idealLookat, alpha);

		this.camera.position.copy(this.currentPosition);
		this.camera.lookAt(this.currentLookat);
	}
}

export default CameraController
