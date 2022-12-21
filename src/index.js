import Movements from "./movements.js";
import blockchain from "./Web3.js";
import abi from "./abi/abi.json" assert {type: "json"};
import landABI from "./abi/landABI.json" assert {type: "json"};
import buildingABI from "./abi/buildingABI.json" assert {type: "json"};
import * as THREE from "three";
import { OrbitControls, MapControls } from "../controls/OrbitControls.js";
import { smc_land_addr, smc_building_addr } from "./contractparams.js";
import { VRButton } from './VRButton.js';
import PlayerController from "../controller/PlayerController.js";
import CameraController from "../controller/CameraController.js";
import { GLTFLoader } from "../controller/GLTFLoader.js";
import { ClampToEdgeWrapping, Loader, Plane } from "three";
import { importModelMap } from "./importModelMap.js";
import { mapFile, ipfsURL, landParcelUnit, landDivideX, landDivideZ, landHeight, landColor, maxLandParcelCnt } from "./constant.js";

const pinataApiKey = 'bcc1339d9dd5f261b305';
const pinataSecretApiKey = '1c5779010155161531ac603d25ac37c8531ed947f7b460544fa304a173de3b05';

var ownerLands = [];

// Declaration  of a new scene with Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0a0a0);
//scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

// Camera and renderer configuration
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 5000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

// Orbit controls
// let controls = new OrbitControls(camera, renderer.domElement);

// Setting the scene lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(10, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 100;
scene.add(dirLight);

// Setting up a flat space of the Metaverse
// const geometry_space = new THREE.BoxGeometry(100, 0.01, 50);
// const material_space = new THREE.MeshPhongMaterial({ color: 0xffffff });
// const space = new THREE.Mesh(geometry_space, material_space);
// scene.add(space);

const playerController = new PlayerController();
playerController.onPlayerCreate = () => {
    scene.add(playerController.getModel());
    const cameraController = new CameraController(playerController.getModel(), camera);

    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();
        
        playerController.update(deltaTime);
        if (cameraController) {
            cameraController.update(deltaTime);
            playerController.update(deltaTime);
        }
        renderer.render(scene, camera);
    }

    animate();
}

window.addEventListener('resize', onWindowResize);

camera.position.set(10, 5, 40);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function uploadFile() {

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`; 

    var uploadFile = document.getElementById('file').files[0];

    const formData = new FormData();
    formData.append('file', uploadFile);
    
    const config = {
		method: "POST",
		maxContentLength: Infinity,
		headers: {
			pinata_api_key: pinataApiKey,
			pinata_secret_api_key: pinataSecretApiKey,
		},
		body: formData,
	};

    try {
		const response = await fetch(url, config);

		const data = await response.json();

        console.log(data.IpfsHash);
		return data.IpfsHash;
	} catch (error) {
		onError({ error });
        return false;
	}
}

const inputLandNum = document.getElementById('land_number');
const inputNFTName = document.getElementById('nft_name');
const inputNftX = document.getElementById('nft_x');
const inputNftY = document.getElementById('nft_y');
const inputNftZ = document.getElementById('nft_z');
const inputGlbSelect = document.getElementById('file');

// New NFT
const buttonMint = document.getElementById('mint');
buttonMint.addEventListener('click', mintNFT);

function OwnOfLand(x, z) {
    let ret = false;
    ownerLands.forEach((land, index) => {
        console.log("land", land.x, land.z);
        if (land.x == x && land.z == z) {
            console.log("OK", index);
            ret = true;
        }
    });

    return ret;
}

async function mintNFT() {
    if (radioLand.checked) {
        mintLand();
    } else if (radioBuilding.checked) {
        mintBuilding();
    }
};

async function mintLand() {
    var landNum = parseInt(inputLandNum.value);
    console.log(landNum);
    if (landNum > maxLandParcelCnt || landNum <= 0 ) {
        alert("You can not own the land");
        return;
    }

    var land_x = (landNum - 1) % landDivideX;
    var land_z = parseInt((landNum - 1) / landDivideX);

    console.log(land_x, land_z);

    if (OwnOfLand(land_x, land_z) == true) {
        alert("You have already owned the land");
        return;
    }

    if ((land_x >= landDivideX) || (land_z >= landDivideZ)) {
        alert("Can't import land");
        return;
    }

    if (typeof window.ethereum == "undefined") {
        rej("You should install Metamask to use it!");
    }

    // Web3 Instance 
    let web3 = new Web3(window.ethereum);
    let contract = new web3.eth.Contract(landABI, smc_land_addr);

    web3.eth.getAccounts().then((accounts) => {
        contract.methods.cost().call().then((cost_nft) => {
            contract.methods.mintLand(land_x, land_z).send({ from: accounts[0], value: parseInt(cost_nft) }).then((data) => {
                importLand(land_x, land_z);
                alert("Land NFT available in the Metaverse!");
            });
        });
    });
}

async function mintBuilding() {

    var landNum = parseInt(inputLandNum.value);
    console.log(landNum);
    if (landNum > maxLandParcelCnt || landNum <= 0 ) {
        alert("You can not import your building on the land");
        return;
    }

    // Parameters to create a NFT in the Metaverse
    var land_x = (landNum - 1) % landDivideX;
    var land_z = parseInt((landNum - 1) / landDivideX);
    var nft_name = inputNFTName.value;
    var nft_x = inputNftX.value;
    var nft_y = inputNftY.value;
    var nft_z = inputNftZ.value;

    console.log(land_x, land_z);

    if (!OwnOfLand(land_x, land_z)) {
        alert("You didn't own the land!");
        return;
    }

    if ((land_x >= landDivideX) || (land_z >= landDivideZ)) {
        alert("The land doesn't exist!");
        return;
    }
    
    if (nft_x >= landParcelUnit || 
        nft_y >= landParcelUnit ||
        nft_z >= landParcelUnit ) {
            alert("Can't import building");
            return;
    }

    let IpfsHash = await uploadFile();

    console.log("IPFSHash", IpfsHash);
    if (IpfsHash === false) {
        return;
    }

    // If Metamask is not available
    if (typeof window.ethereum == "undefined") {
        rej("You should install Metamask to use it!");
    }

    //Web3 Instance 
    let web3 = new Web3(window.ethereum);
    let contract = new web3.eth.Contract(buildingABI, smc_building_addr);

    web3.eth.getAccounts().then((accounts) => {
        contract.methods.cost().call().then((cost_nft) => {
            contract.methods.mintBuilding(nft_name, land_x, land_z, nft_x, nft_y, nft_z, "ipfs://" + IpfsHash).send({ from: accounts[0], value: parseInt(cost_nft) }).then((data) => {
                console.log(ipfsURL + IpfsHash, land_x, land_z, nft_x, nft_y, nft_z);
                importBuilding(ipfsURL + IpfsHash, land_x, land_z, nft_x, nft_y, nft_z);
                alert("Building NFT available in the Metaverse!");
            });
        });
    });
}

// Profit extraction
const buttonProfit = document.getElementById('profit');
buttonProfit.addEventListener('click', profitNFT);

function profitNFT() {
    
};

// Web3 connection to the data generated in the blockchain to be 
// represented in the Metaverse
blockchain.then((result) => {
    // For each building paid for in the Smart Contract,
    // a graphical representation is made in the Metaverse
    result.land.forEach((land, index) => {
        if (index <= result.land_supply) {
            importLand(land.x, land.y);
        };
    });

    console.log(ownerLands);

    result.building.forEach((building, index) => {
        if (index <= result.build_supply) {
            const url = building.url;
            let realURL = url.replace("ipfs://", ipfsURL);

            importBuilding(realURL, building.land_x, building.land_y, building.x, building.y, building.z);
        };
    });

    console.log(result);
});

const radioLand = document.getElementById('Land');
radioLand.addEventListener('click', checkLandRadio);

function checkLandRadio() {
    // if (radioLand.checked == true) {
    //     return;
    // }
    inputLandNum.disabled = false;
    inputNFTName.disabled = true;
    inputNftX.disabled = true;
    inputNftY.disabled = true;
    inputNftZ.disabled = true;
    inputGlbSelect.disabled = true;
}

const radioBuilding = document.getElementById('Building');
radioBuilding.addEventListener('click', checkBuildingRadio);

function checkBuildingRadio() {
    inputNFTName.disabled = false;
    inputNftX.disabled = false;
    inputNftY.disabled = false;
    inputNftZ.disabled = false;
    inputGlbSelect.disabled = false;
}

function importLand (land_x, land_z) {
    ownerLands.push({x:parseInt(land_x), z: parseInt(land_z)});
    const boxGeometry = new THREE.BoxGeometry(landParcelUnit, landHeight, landParcelUnit);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: landColor });

    const land = new THREE.Mesh(boxGeometry, boxMaterial);
    let realPosX = landParcelUnit * land_x;
    let realPosZ = landParcelUnit * land_z;
    land.position.copy(new THREE.Vector3(realPosX, 0, realPosZ));
    scene.add(land);
}

function importBuilding(building_url, land_x, land_z, building_x, building_y, building_z) {
    console.log("import building");

    const loader = new GLTFLoader();

    loader.load( building_url, function ( gltf ) {
        gltf.scene.position.x = parseInt(land_x*landParcelUnit) + parseInt(building_x) - 26;
        gltf.scene.position.y = building_y;
        gltf.scene.position.z = parseInt(land_z*landParcelUnit) + parseInt(building_z) - 26;

        console.log(gltf.scene.position.x, gltf.scene.position.y, gltf.scene.position.z);
        
        scene.add( gltf.scene );
    } );
}

function initSocket() {
    console.log('init socket');
    this.socket = io('http://10.10.13.85:3000'); //io('https://arenaserver.herokuapp.com/');

    this.player = {};
    this.players = {};

    this.socket.on('connect', () => {
        this.socket.on('initPlayer', (data, playerCount, playerIDs) => {
            this.player.id = data.id;
            console.log(
                `I am ${this.socket.id}, the ${playerCount}${
                    playerCount <= 1
                        ? 'st'
                        : playerCount == 2
                        ? 'nd'
                        : playerCount == 3
                        ? 'rd'
                        : 'th'
                } player`
            );

            // Check all that isn't local player
            for (let i = 0; i < playerCount; i++) {
                if (playerIDs[i] !== this.player.id) {
                    console.log(
                        `${playerIDs[i]} needs to be added to the world...`
                    );
                    this.initRemotePlayer(playerIDs[i]);
                }
            }
        });
    });

    this.socket.on('playerPositions', (players) => {
        this.updateRemotePlayers(players);
    });

    this.socket.on('player connect', (playerId, playerCount) => {
        console.log(`${playerId} joined the session!`);
        console.log(`There are now ${playerCount} players`);
        if (playerId !== this.player.id) {
            console.log(`${playerId} needs to be added to the world...`);
            this.initRemotePlayer(playerId);
        }
        this.addStatusMessage(playerId, 'join');
    });

    this.socket.on('player disconnect', (playerId, playerCount) => {
        this.deleteRemotePlayer(playerId);
        console.log(`${playerId} has left us...`);
        console.log(`There are now ${playerCount} players`);
        this.addStatusMessage(playerId, 'leave');
    });

    this.socket.on('connect', () => {
        this.socket.on('chat message', (username, message) => {
            this.addChatMessage(username, message);
        });
    });

    this.socket.on('shootSyncRocket', (playerData, playerID) => {
        this.shootRemoteRocket(playerData, playerID);
    });

    this.socket.on('kill message', (shooter, killed) => {
        if (shooter) {
            this.addKillMessage(shooter, killed);
        } else {
            this.addKillMessage(killed);
        }
    });
}
