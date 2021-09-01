const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
const { ethers, web3, upgrades } = hre;
const BigNumber = ethers.BigNumber;
let c = require('../deployments/deploymentConfig.json');

async function main() {
  const config = c[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];

  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Mock");
  const rewardToken = await hre.ethers.getContractAt(erc20Artifact.abi, config.rewardTokenAddress);

  const rewardTokenDecimals = await rewardToken.decimals();
  const rewardTokenAmount = BigNumber.from(config.rewardTokenAmount).mul(BigNumber.from(10).pow(rewardTokenDecimals));

  const tokensFarmArtifact = await hre.artifacts.readArtifact("TokensFarm");
  const tokensFarm = await hre.ethers.getContractAt(tokensFarmArtifact.abi, contracts["TokensFarm"]);

  await tokensFarm.fund(rewardTokenAmount);
  console.log('Farm funded properly.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
