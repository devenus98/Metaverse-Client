import * as THREE from "three";
import io from 'socket.io-client';
import CameraController from "../controller/CameraController";
import PlayerController from "../controller/PlayerController";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { VRButton } from './VRButton.js';
import { serverIP, pinata, landContract, buildingContract, ipfsURL, landColor, landHeight, landParcelUnit, landDivideX, landDivideZ } from "./config.jsx";

const Web3 = require('web3');

class Metaverse {
    constructor() {
        //WebGL
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.landGeometry = null;
        this.landMaterial = null;
        this.cameraController = null;

        //Player
        this.player = null;
        this.player1 = null;
        this.players = null;
        this.remotePlayerIDs = [];

        //NFT
        this.account = null;
        this.web3 = null;
        this.landContract = null;
        this.buildingContract = null;

        this.lands = [];
        this.landAmount = 0;
        this.ownerLands = [];
        this.landMaxAmount = 0;
        this.landParcel = 0;
        
        this.buildings = [];
        this.buildingAmount = 0;
        this.ownerBuildings = [];
        this.BuildingMaxAmount = 0;

        this.metamask = false;

        this.requestAnimId = null;


        this.elaspedTime = 0;

        this.startAnimation = startAnimation.bind(this);

        //UI
        this.ui = {
            body: document.querySelector('body'),
            selectLand: document.getElementById('Land'),
            selectBuilding: document.getElementById('Building'),
            landNumber: document.getElementById('land_number'),
            nftName: document.getElementById('nft_name'),
            nftXPos: document.getElementById('nft_x'),
            nftYPos: document.getElementById('nft_y'),
            nftZPos: document.getElementById('nft_z'),
            uploadFiles: document.getElementById('file'),
            mintButton: document.getElementById('mint'),
            profitButton: document.getElementById('profit'),
        };
    }

    load() {
        console.log("PERLOADING...");

        this.initWeb3();
        this.initScene();
        this.initSkybox();
        this.initMap();
        this.initPlayer();
        this.initUI();
        this.initSocket();

        this.getNftInfo();
    }

    start() {
        console.log("START");

        this.activateSelectLand();
        this.activateSelectBuilding();
        this.activateNFTmint();
        this.activateProfit();
        this.startAnimation();
    }

    tick() {
        const deltaTime = this.clock.getDelta();
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
            this.player.update(deltaTime);
        }

        this.updatePlayerMovement();

        for (let id in this.remotePlayerIDs) {
            let playerID = this.remotePlayerIDs[id];
            if (this.players[playerID].create == true) {
                this.players[playerID].update(deltaTime);
            }
        }       

        this.renderer.render(this.scene, this.camera);
    }

    async uploadFile() {
        console.log("UPLOADING FILE...");
        var file = this.ui.uploadFiles.files[0];

        const formData = new FormData();
        formData.append('file', file);

        const config = {
            method: 'POST',
            maxContentLength: Infinity,
            headers: {
                pinata_api_key: pinata.apikey,
			    pinata_secret_api_key: pinata.secretApiKey,
            },
            body: formData,
        };

        try {
            const response = await fetch(pinata.url, config);
            const data = await response.json();
    
            console.log("IPFSHash", data.IpfsHash);

            return data.IpfsHash;
        } catch (error) {
            onError({ error });
            return false;
        }
    }

    activateNFTmint() {
        this.ui.mintButton.addEventListener('click', () => {
            if (this.ui.selectLand.checked) {
                console.log("MINTING LAND...");

                this.mintLand();

                console.log("mint land");
            } else if (this.ui.selectBuilding.checked) {
                console.log("MINTING BUILDING...");

                this.mintBuilding();

                console.log("mint building");
            }
        })
    }

    async mintLand() {
        console.log("MINTING LAND");
        var landNum = parseInt(this.ui.landNumber.value);        
        console.log("Land Number : ", landNum);

        if (landNum > this.landMaxAmount || landNum <= 0 ) {
            alert("You can not own the land(1-44000)");
            return;
        }

        //will check
        if (this.lands.includes(landNum)) {
            alert("You had the land");
            return;
        }

        this.landContract.methods.cost().call().then((cost_nft) => {
            this.landContract.methods.mintLand(landNum).send({ from: this.account, value: parseInt(cost_nft) }).then((data) => {
                this.addLand(landNum);
                alert("Land NFT available in the Metaverse!");
            });
        });

    }

    async mintBuilding () {
        var landNum = parseInt(this.ui.landNumber.value);        
        console.log("Land Number : ", landNum);

        //will check
        if (this.lands.includes(landNum)) {
            alert("You didn't have the land.");
        }

        // Parameters to create a NFT in the Metaverse
        var nftName = this.ui.nftName.value;
        var nftX = this.ui.nftXPos.value;
        var nftY = this.ui.nftYPos.value;
        var nftZ = this.ui.nftZPos.value;

        if (nftX >= this.landParcel || 
            nftY >= this.landParcel ||
            nftZ >= this.landParcel ) {
                alert("Can't add building");
                return;
        }

        let IpfsHash = await this.uploadFile();

        console.log("IPFSHash", IpfsHash);
        if (IpfsHash === false) {
            return;
        }

        this.buildingContract.methods.cost().call().then((cost_nft) => {
            this.buildingContract.methods.mintBuilding(nftName, landNum, nftX, nftY, nftZ, "ipfs://" + IpfsHash).send({ from: this.account, value: parseInt(cost_nft) }).then((data) => {
                console.log(ipfsURL + IpfsHash, landNum, nftX, nftY, nftZ);
                this.addBuilding(ipfsURL + IpfsHash, landNum, nftX, nftY, nftZ);
                alert("Building NFT available in the Metaverse!");
            });
        });
    }

    addLand(landNum) {
        console.log("ADDING LAND...");
        const land = new THREE.Mesh(this.landGeometry, this.landMaterial);
        console.log("Land Info", land);

        var landXPos = (parseInt(landNum) - 1) % landDivideX;
        var landZPos = parseInt((parseInt(landNum) - 1) / landDivideX);

        console.log("Adding land : ", landXPos, landZPos);

        land.position.copy(new THREE.Vector3(landXPos*landParcelUnit, 0, landZPos*landParcelUnit));

        this.scene.add(land);

        console.log("Added land.");
    }

    addBuilding(url, landNum, x, y, z) {
        var landX = (parseInt(landNum) - 1) % landDivideX;
        var landZ = parseInt((parseInt(landNum) - 1) / landDivideX);

        console.log("ADDING BUILDING...", landX, landZ, x, y, z);

        //const gltfLoader = new GLTFLoader();
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/');
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(url, ( gltf ) => {
            gltf.scene.position.x = parseInt(landX*landParcelUnit) + parseInt(x) - 26;
            gltf.scene.position.y = y;
            gltf.scene.position.z = parseInt(landZ*landParcelUnit) + parseInt(z) - 26;
            
            this.scene.add(gltf.scene);
        } );
    }

    activateProfit() {
        this.ui.profitButton.addEventListener('click', () => {
            // If Metamask is not available
            if (typeof window.ethereum == "undefined") {
                rej("You should install Metamask to use it!");
            }
            // this.web3.eth.getAccounts().then((accounts) => {
            //     contract.methods.withdraw().send({ from: accounts[0] }).then((data) => {
            //         alert("Profit extraction!");
            //     });
            // });
        })
    }

    activateSelectBuilding() {
        this.ui.selectBuilding.addEventListener('click', () => {
            this.ui.nftName.disabled = false;
            this.ui.nftXPos.disabled = false;
            this.ui.nftYPos.disabled = false;
            this.ui.nftZPos.disabled = false;
            this.ui.uploadFiles.disabled = false;
        });
    }

    activateSelectLand() {
        this.ui.selectLand.addEventListener('click', () => {
            this.ui.landNumber.disabled = false;
            this.ui.nftName.disabled = true;
            this.ui.nftXPos.disabled = true;
            this.ui.nftYPos.disabled = true;
            this.ui.nftZPos.disabled = true;
            this.ui.uploadFiles.disabled = true;
        })
    }


    initWeb3() {
        if (typeof window.ethereum == "undefined") {
            alert("You should install Metamask to use it!");
            return;
        }

        this.web3 = new Web3(window.ethereum);
        this.landContract =  new this.web3.eth.Contract(landContract.abi, landContract.address);
        this.buildingContract = new this.web3.eth.Contract(buildingContract.abi, buildingContract.address);

        this.metamask = true;
    }

    getNftInfo() {
        this.web3.eth.requestAccounts().then((accounts) => {
            var account = accounts[0];
            // Get the current supply of Land NFT Tokens
            this.landContract.methods.totalSupply().call({from: account}).then((supply) =>{
                this.landAmount = supply;
                console.log("-> Current supply of Land NFT Tokens is: ", supply);
            });

            // Get the current supply of Building NFT Tokens
            this.buildingContract.methods.totalSupply().call({from: account}).then((supply) =>{
                this.buildingAmount = supply;
                console.log("-> Current supply of Building NFT Tokens is: ", supply);
            });

            // Get the Maximum supply of Land NFT Tokens
            this.landContract.methods.maxSupply().call({from: account}).then((maxsupply) =>{
                this.landMaxAmount = maxsupply;
                console.log("-> Maximum supply of Land NFT Tokens is: ", maxsupply);
            });

            // Get the Maximum supply of building NFT Tokens
            this.buildingContract.methods.maxSupply().call({from: account}).then((maxsupply) =>{
                this.BuildingMaxAmount = maxsupply;
                console.log("-> Maximum supply of Building NFT Tokens is: ", maxsupply);
            });

            // Get your lands made in the Metaverse
            this.landContract.methods.getOwnerLands().call({from: account}).then((lands) =>{
                this.ownerLands = lands;
                console.log("-> Your lands: ", lands);
            });
            
            // Get your buildings made in the Metaverse
            this.buildingContract.methods.getOwnerBuildings().call({from: account}).then((buildings) =>{
                this.ownerBuildings = buildings;
                console.log("-> Your buildings: ", buildings);
            });

            // // Get your land parcel in the Metaverse
            // this.landContract.methods.getLandParcel().call({from: account}).then((landParcel) =>{
            //     this.landParcel = landParcel;
            //     console.log("->Land Parcel: ", landParcel);
            // });
        })
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.camera = new THREE.PerspectiveCamera (
            100,
            window.innerWidth / window.innerHeight,
            1,
            5000
        );
        this.camera.position.set(10, 5, 40);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.xr.enabled = true;

        this.ui.body.appendChild(this.renderer.domElement);
        this.ui.body.appendChild(VRButton.createButton(this.renderer));
     
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            //this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        });

        console.log('init scene');
    }

    initSkybox() {
        this.scene.background = new THREE.Color(0xa0a0a0);

        console.log("init skybox");
    }

    initMap() {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        const dirLight = new THREE.DirectionalLight(0xffffff);

        this.landGeometry = new THREE.BoxGeometry(52, landHeight, 52);
        this.landMaterial = new THREE.MeshStandardMaterial({ color: landColor });

        hemiLight.position.set(0, 20, 0);

        dirLight.position.set(10, 10, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;

        this.scene.add(hemiLight);
        this.scene.add(dirLight);

        this.web3.eth.requestAccounts().then((accounts) => {
            this.account = accounts[0];
            console.log("-> My account is: ", this.account);

            // Get your land parcel in the Metaverse
            this.landContract.methods.getLandParcel().call({from: this.account}).then((landParcel) =>{
                this.landParcel = landParcel;
                console.log("->Land Parcel: ", landParcel);
            });

            // Get all the lands made in the Metaverse 
            this.landContract.methods.getLands().call({from: this.account}).then((lands) =>{
                this.lands = lands;
                console.log("-> All lands: ", this.lands);

                this.lands.forEach((land, index) => {
                    this.addLand(land);
                });
            });

            //Get all the buildings made in the Metaverse 
            this.buildingContract.methods.getBuildings().call({from: this.account}).then((buildings) =>{
                this.buildings = buildings;
                console.log("-> All buildings: ", buildings);

                this.buildings.forEach((building, index) => {
                    // if (index <= this.buildingAmount) {
                    //     let realURL = building.url.replace("ipfs://", ipfsURL);
                    //     this.addBuilding(realURL, building.land_x, building.land_y, building.x, building.y, building.z);
                    // };
                    let realURL = building.url.replace("ipfs://", ipfsURL);
                    console.log("building url", realURL);
                    this.addBuilding(realURL, building.land, building.x, building.y, building.z);
                });
            });
        
        })

        console.log("init map");
    }

    initPlayer() {
        this.player = new PlayerController(false);
        this.player.onCreate = () => {
            console.log("onCreate Start!")
            this.scene.add(this.player.getModel());
            this.cameraController = new CameraController(this.player.getModel(), this.camera);

            this.start();
        }

        // this.player1 = new PlayerController(false);
        // this.player1.onCreate = () => {
        //     console.log("onCreate Start!")
        //     this.scene.add(this.player1.getModel());
        //     //this.cameraController = new CameraController(this.player.getModel(), this.camera);
        //     //const deltaTime = this.clock.getDelta();
        //     this.player1.getModel().position.set(0, 0, 2);
        //     const deltaTime = this.clock.getDelta();
        //     //this.player1.update(deltaTime);
            

        //     //this.start();
        // }
        
        console.log("init player");
    }

    initUI() {
        if (!this.metamask) {
            this.ui.selectLand.disabled = true;
            this.ui.selectBuilding.disabled = true;
            this.ui.landNumber.disabled = true;
            this.ui.mintButton.disabled = true;
            this.ui.profitButton.disabled = true;
        }
    }

    initSocket() {
        console.log('init socket');
        this.socket = io(serverIP);

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
            })
        });

        this.socket.on('playerPositions', (players) => {
            this.updateRemotePlayers(players);
            //console.log(players);
        });

        this.socket.on('player connect', (playerId, playerCount) => {
            console.log(`${playerId} joined the session!`);
            console.log(`There are now ${playerCount} players`);
            if (playerId !== this.player.id) {
                console.log(`${playerId} needs to be added to the world...`);
                this.initRemotePlayer(playerId);
            }
        });

        this.socket.on('player disconnect', (playerId, playerCount) => {
            this.deleteRemotePlayer(playerId);
            console.log(`${playerId} has left us...`);
            console.log(`There are now ${playerCount} players`);
        });

    }

    initRemotePlayer(playerID) {
        console.log("Init Remote Player", playerID);
        this.players[playerID] = {};
        
        this.players[playerID] = new PlayerController(true);
        this.players[playerID].onCreate = () => {
            console.log("remote player Create Start!")
            this.scene.add(this.players[playerID].getModel());
            this.players[playerID].getModel().position.set(0, 0, 1);
            this.remotePlayerIDs.push(playerID);
        }
    }

    updatePlayerMovement() {
        this.uploadMovementData();
    }

    
    updateRemotePlayers(remotePlayers) {
        //console.log(remotePlayers);
        for (let id in remotePlayers) {
            if (id != this.player.id) {
                if (this.players[id].create == true) {
                    //console.log(first)
                    // console.log("!!!remotePlayer", remotePlayers[id].pos[0],
                    //     remotePlayers[id].pos[1], 
                    //     remotePlayers[id].pos[2],
                    //     remotePlayers[id].rotate,
                    //     remotePlayers[id].moveState);
                    this.players[id].setMoveData(
                        remotePlayers[id].pos[0],
                        remotePlayers[id].pos[1], 
                        remotePlayers[id].pos[2],
                        remotePlayers[id].rotate[0],
                        remotePlayers[id].rotate[1],
                        remotePlayers[id].rotate[2],
                        remotePlayers[id].moveState
                    );
                }
            }
        }

        // for (let id in remotePlayers) {
        //     if (id != this.player.id) {
        //         console.log("Update pos Info", remotePlayers[id].pos[0], remotePlayers[id].pos[1], remotePlayers[id].pos[2]);
        //         // Should not forget to reuse vectors
        //         this.players[id].positionSync = new THREE.Vector3().fromArray(
        //             remotePlayers[id].pos
        //         );
        //         // this.players[id].lookDirection = new THREE.Vector3().fromArray(
        //         //     remotePlayers[id].direction
        //         // );

        //         //Set player position
        //         this.players[id].mesh.position.add(
        //             this.players[id].positionSync
        //         );

        //         // // Set head rotation
        //         // this.players[id].mesh.rotation.y =
        //         //     this.players[id].lookDirection.x;
        //         // this.players[id].mesh.rotation.x =
        //         //     this.players[id].lookDirection.y;
        //     }
        // }
    }

    deleteRemotePlayer(playerID) {
        this.scene.remove(this.players[playerID].getModel());
        delete this.players[playerID];
        let index = this.remotePlayerIDs.indexOf(playerID);
        if (index > -1) { // only splice array when item is found
            this.remotePlayerIDs.splice(index, 1); // 2nd parameter means remove one item only
        }

        console.log("Delete Remote Player", playerID);
        console.log(this.players);
    }

    uploadMovementData() {
        this.socket.emit('updateClientPos', 
                        [
                            this.player.getModel().position.x,
                            this.player.getModel().position.y,
                            this.player.getModel().position.z,
                        ],
                        [
                            this.player.getModel().rotation.x,
                            this.player.getModel().rotation.y,
                            this.player.getModel().rotation.z,
                        ],
                        this.player.moveState
                        );

    }
}

function startAnimation() {
    this.requestAnimId = requestAnimationFrame(this.startAnimation);
    this.tick();
}

export default new Metaverse();