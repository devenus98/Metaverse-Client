import abi from "./abi/abi.json" assert {type: "json"};
import landABI from "./abi/landABI.json" assert {type: "json"};
import buildingABI from "./abi/buildingABI.json" assert {type: "json"};
import {smc_building_addr, smc_land_addr} from "./contractparams.js";

// SC: 0xFb25E1F3774E802E90a421987E10b621D2B7d346

const blockchain = new Promise((res, rej) => {

    // If Metamask is not available
    if(typeof window.ethereum == "undefined"){
        rej("You should install Metamask to use it!");
    }

    // Web3 Instance 
    let web3 = new Web3(window.ethereum);
    let landContract = new web3.eth.Contract(landABI, smc_land_addr);
    let buildingContract = new web3.eth.Contract(buildingABI, smc_building_addr);

    // Get my Metamask address
    web3.eth.requestAccounts().then((accounts) =>{
        console.log("-> My account is: ", accounts[0]);
    });

    // Get the current supply of NFT Tokens
    web3.eth.requestAccounts().then((accounts) =>{
        landContract.methods.totalSupply().call({from: accounts[0]}).then((supply) =>{
            console.log("-> Current supply of Land NFT Tokens is: ", supply);
        });

        buildingContract.methods.totalSupply().call({from: accounts[0]}).then((supply) =>{
            console.log("-> Current supply of Building NFT Tokens is: ", supply);
        });
    });

    // Get the Maximum supply of NFT Tokens
    web3.eth.requestAccounts().then((accounts) =>{
        landContract.methods.maxSupply().call({from: accounts[0]}).then((maxsupply) =>{
            console.log("-> Maximum supply of Land NFT Tokens is: ", maxsupply);
        });

        buildingContract.methods.maxSupply().call({from: accounts[0]}).then((maxsupply) =>{
            console.log("-> Maximum supply of Building NFT Tokens is: ", maxsupply);
        });
    });

    // Get your buildings made in the Metaverse
    web3.eth.requestAccounts().then((accounts) =>{
        landContract.methods.getOwnerLands().call({from: accounts[0]}).then((buildings) =>{
            console.log("-> Your lands: ", buildings);
        });
        
        buildingContract.methods.getOwnerBuildings().call({from: accounts[0]}).then((buildings) =>{
            console.log("-> Your buildings: ", buildings);
        });
    });

    // Get all the buildings made in the Metaverse 
    web3.eth.requestAccounts().then((accounts) =>{
        landContract.methods.totalSupply().call({from: accounts[0]}).then((landSupply) =>{
            landContract.methods.getLands().call({from: accounts[0]}).then((landData) => {
                buildingContract.methods.totalSupply().call({from: accounts[0]}).then((buildingSupply) =>{
                    buildingContract.methods.getBuildings().call({from: accounts[0]}).then((buildingData) => {
                        res({land_supply: landSupply, land: landData, build_supply: buildingSupply, building:buildingData });
                    });
                });
            });
        });
    });
});

export default blockchain;