import PlayerMoveController from "./PlayerMoveController.js";
import PlayerInputController from "./PlayerInputController.js";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

class PlayerController {
	constructor(remote) {
		this.id = null;
		this.remote = remote;
		this.create = false;
		this.moveState = PlayerMoveController.MoveState.idle;
		
		if (remote == false) {
			const playerInputController = new PlayerInputController((keys) => {
				let moveState;
				if (keys.forward) {
					if (keys.shift) {
						moveState = PlayerMoveController.MoveState.run;
					} else {
						moveState = PlayerMoveController.MoveState.walk;
					}
				} else {
					moveState = PlayerMoveController.MoveState.idle;
				}
	
				this.playerMoveController.setMoveState(moveState);
				this.moveState = moveState;
	
				if (keys.left) {
					this.playerMoveController.rotateState = PlayerMoveController.RotateState.left;
				} else if (keys.right) {
					this.playerMoveController.rotateState = PlayerMoveController.RotateState.right;
				} else {
					this.playerMoveController.rotateState = PlayerMoveController.RotateState.none;
				}
			});
		}
		

		const gltfLoader = new GLTFLoader().setPath('models/');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/');
        gltfLoader.setDRACOLoader(dracoLoader);

		gltfLoader.load(
			'bot.glb',
			(gltf) => {
				this.playerMoveController = new PlayerMoveController(gltf, this.remote);
				//this.playerMoveController.setMoveState(PlayerMoveController.MoveState.idle);
				this.create = true;
				this.onCreate();
			},
			(xhr) => {
				console.log(xhr.loaded + "/" + xhr.total);
			},
			(error) => {
				console.log(error);
			},
		);
	}

	setMoveData(x, y, z, rX, rY, rZ, rotate, moveState) {
		if (this.remote == true) {
			this.playerMoveController.setMoveData(x, y, z, rX, rY, rZ, rotate, moveState);
			//console.log("setUpdateMoveData", x, y, z, rotate, moveState);
		}
	}

	update(deltaTime) {
		this.playerMoveController.update(deltaTime);
	}

	getModel() {
		return this.playerMoveController.model;
	}
}

export default PlayerController;