class PlayerInputController {
	constructor(keyEventListener) {
		const keys = {
			forward: false,
			backward: false,
			left: false,
			right: false,
			space: false,
			shift: false,
		}

		const keydownListener = (event) => {
			if (event.code === "KeyW") {
				keys.forward = true;
				keyEventListener(keys);
			} else if (event.code === "KeyS") {
				keys.backward = true;
				keyEventListener(keys);
			} else if (event.code === "KeyA") {
				keys.left = true;
				keyEventListener(keys);
			} else if (event.code === "KeyD") {
				keys.right = true;
				keyEventListener(keys);
			} else if (event.key === "Space") {
				keys.space = true;
				keyEventListener(keys);
			} else if (event.key === "Shift") {
				keys.shift = true;
				keyEventListener(keys);
			}
		}

		const keyupListener = (event) => {
			if (event.code === "KeyW") {
				keys.forward = false;
				keyEventListener(keys);
			} else if (event.code === "KeyS") {
				keys.backward = false;
				keyEventListener(keys);
			} else if (event.code === "KeyA") {
				keys.left = false;
				keyEventListener(keys);
			} else if (event.code === "KeyD") {
				keys.right = false;
				keyEventListener(keys);
			} else if (event.key === "Space") {
				keys.space = false;
				keyEventListener(keys);
			} else if (event.key === "Shift") {
				keys.shift = false;
				keyEventListener(keys);
			}
		}

		document.addEventListener("keydown", (event) => keydownListener(event));
		document.addEventListener("keyup", (event) => keyupListener(event));
	}
}

export default PlayerInputController;