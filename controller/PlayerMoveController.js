import * as THREE from "three";

class PlayerMoveController {

	static MoveState = {
		idle: "idle",
		walk: "walk",
		run: "run",
	}

	static RotateState = {
		none: "none",
		left: "left",
		right: "right",
	}

	walkSpeed = 0.6;
	runSpeed = 1.2;
	rotateSpeed = 1;

	animations = {
		idle: { weight: 1 },
		walk: { weight: 0 },
		run: { weight: 0 },
	}

	constructor(gltf, remote) {
		this.model = gltf.scene;
		this.remote = remote;

		this.model.traverse((object) => {
			if (object.isMesh) object.castShadow = true;
		});

		const skeleton = new THREE.SkeletonHelper(this.model);
		skeleton.visible = true;
		// Game.sacene.add(skeleton);

		const animations = gltf.animations;
		const mixer = new THREE.AnimationMixer(this.model);
		this.mixer = mixer;

		animations.forEach((animation) => {
			
			if (PlayerMoveController.MoveState[animation.name]) {
				const action = this.mixer.clipAction(animation);
				this.animations[animation.name].action = action;
				const weight = this.animations[animation.name].weight;
				this.activateAction(action, weight);
			}
		});

		this.currentMoveState = PlayerMoveController.MoveState.idle;
		this.pos = new THREE.Vector3(0, 0, 0);
		this.rotate = new THREE.Vector3(0, 0, 0);
	}

	update(deltaTime) {
		if (this.remote == false) {
			let moveSpeed;
			if (this.currentMoveState === PlayerMoveController.MoveState.walk) {
				moveSpeed = this.walkSpeed;
			} else if (this.currentMoveState === PlayerMoveController.MoveState.run) {
				moveSpeed = this.runSpeed;
			} else {
				moveSpeed = 0;
			}
	
			this.model.position.add(this.getForwardDirection().multiplyScalar(moveSpeed * deltaTime));

			let rotateDirection;
			if (this.rotateState === PlayerMoveController.RotateState.left) {
				rotateDirection = 1;
			} else if (this.rotateState === PlayerMoveController.RotateState.right) {
				rotateDirection = -1;
			} else {
				rotateDirection = 0;
			}

			this.model.rotateY(rotateDirection * this.rotateSpeed * deltaTime);
		} else {
			this.model.position.x = this.pos.x;
			this.model.position.y = this.pos.y;
			this.model.position.z = this.pos.z;
			this.model.rotation.x = this.rotate.x;
			this.model.rotation.y = this.rotate.y;
			this.model.rotation.z = this.rotate.z;
		}
		
		this.mixer.update(deltaTime);
	}

	getForwardDirection() {
		const forwardDirection = new THREE.Vector3();
		this.model.getWorldDirection(forwardDirection);
		forwardDirection.normalize();

		return forwardDirection;
	}

	getSideDirection() {
		const sideDirection = this.getForwardDirection();
		sideDirection.cross(this.model.up);

		return sideDirection;
	}

	setMoveData(x, y, z, rX, rY, rZ, moveState) {
		this.pos.x = x;
		this.pos.y = y;
		this.pos.z = z;
		this.rotate.x = rX;
		this.rotate.y = rY;
		this.rotate.z = rZ;
		
		this.setMoveState(moveState);
	}

	setMoveState(moveState) {
		if (this.currentMoveState !== moveState) {
			const currentAction = this.animations[this.currentMoveState].action;
			const nextAction = this.animations[moveState].action;
			this.prepareCrossFade(currentAction, nextAction, 0.35);
		}
	}

	activateAction(action, weight) {
		this.setWeight(action, weight);
		action.play();
	}

	setWeight(action, weight) {
		action.enabled = true;
		action.setEffectiveTimeScale(1);
		action.setEffectiveWeight(weight);
	}

	prepareCrossFade(startAction, endAction, duration) {
		if (this.currentMoveState === PlayerMoveController.MoveState.idle
			|| !startAction || !endAction) {
			this.executeCrossFade(startAction, endAction, duration);
		} else {
			this.synchronizeCrossFade(startAction, endAction, duration);
		}

		if (endAction) {
			const clip = endAction.getClip();
			this.currentMoveState = clip.name;
		} else {
			this.currentMoveState = PlayerMoveController.MoveState.idle;
		}
	}

	synchronizeCrossFade(startAction, endAction, duration) {
		const onLoopFinished = (event) => {
			if (event.action === startAction) {
				this.mixer.removeEventListener("loop", onLoopFinished);
				this.executeCrossFade(startAction, endAction, duration);
			}
		}

		this.mixer.addEventListener("loop", onLoopFinished);
	}

	executeCrossFade(startAction, endAction, duration) {
		if (endAction) {
			this.setWeight(endAction, 1);
			endAction.time = 0;

			if (startAction) {
				startAction.crossFadeTo(endAction, duration, true);
			} else {
				endAction.fadeIn(duration);
			}
		} else {
			startAction.fadeOut(duration);
		}
	}
}

export default PlayerMoveController;