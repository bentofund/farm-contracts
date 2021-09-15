const hre = require("hardhat");
const { hexify, toHordDenomination } = require('../test/setup');
const { saveContractAddress } = require('./utils')
let c = require('../deployments/deploymentConfig.json');

async function main() {
    await hre.run('compile');

    const config = c[hre.network.name];

    const TokensFarmCongress = await hre.ethers.getContractFactory("TokensFarmCongress");
    const tokensfarmCongress = await TokensFarmCongress.deploy();
    await tokensfarmCongress.deployed();
    console.log("TokensFarmCongress contract deployed to:", tokensfarmCongress.address);
    saveContractAddress(hre.network.name, 'HordCongress', tokensfarmCongress.address);

    const TokensFarmCongressMembersRegistry = await hre.ethers.getContractFactory("TokensFarmCongressMembersRegistry");
    const tokensFarmCongressMembersRegistry = await TokensFarmCongressMembersRegistry.deploy(
        config.initialCongressMembers,
        hexify(config.initialCongressMembersNames),
        tokensfarmCongress.address
    );
    await tokensFarmCongressMembersRegistry.deployed();
    console.log("TokensFarmCongressMembersRegistry contract deployed to:", tokensFarmCongressMembersRegistry.address);
    saveContractAddress(hre.network.name, 'TokensFarmCongressMembersRegistry', tokensFarmCongressMembersRegistry.address);

    await tokensfarmCongress.setMembersRegistry(tokensFarmCongressMembersRegistry.address);
    console.log('TokensFarmCongress.setMembersRegistry(',tokensFarmCongressMembersRegistry.address,') set successfully.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
