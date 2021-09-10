const hre = require("hardhat");
const Dec = require('decimal.js');
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
const { ethers, web3, upgrades } = hre;
let c = require('../deployments/deploymentConfig.json');
const { BigNumber } = require("@ethersproject/bignumber");

async function main() {
  const config = c[hre.network.name];

  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Mock");
  const ERC20 = await hre.ethers.getContractFactory('ERC20Mock');

  const initialAmount = Dec('21000000000').mul(10 ** process.env.ERC20_DECIMALS).floor().toFixed().toString();
  const erc20 = await ERC20.deploy(process.env.ERC20_NAME, process.env.ERC20_SYMBOL, process.env.ERC20_DECIMALS, initialAmount);
  await erc20.deployed();
  console.log('ERC20 deployed with address: ', erc20.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
