const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
const { ethers, web3, upgrades } = hre;
let c = require('../deployments/deploymentConfig.json');
const { BigNumber } = require("@ethersproject/bignumber");

async function main() {
  const config = c[hre.network.name];

  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Mock");
  const rewardToken = await hre.ethers.getContractAt(erc20Artifact.abi, config.rewardTokenAddress);

  const secondsInDay = 24*60*60;
  const rewardTokenDecimals = await rewardToken.decimals();
  const rewardPerSecond = BigNumber.from(config.rewardTokenAmount).mul(BigNumber.from(10).pow(rewardTokenDecimals)).div(config.farmPeriod).div(secondsInDay);
  const minTimeToStake = config.minTimeToStake * secondsInDay;
   
  const TokensFarm = await hre.ethers.getContractFactory('TokensFarm');
  const tokensFarm = await TokensFarm.deploy(
    config.rewardTokenAddress,
    rewardPerSecond,
    config.startTime,
    minTimeToStake,
    true,
    config.penaltyType,
    config.stakingTokenAddress,
    config.congressAddress
  );
  await tokensFarm.deployed();
  console.log('TokensFarm deployed with address: ', tokensFarm.address);
  saveContractAddress(hre.network.name, 'TokensFarm', tokensFarm.address);

  const tokensFarmArtifact = await hre.artifacts.readArtifact("TokensFarm");
  saveContractAbis(hre.network.name, 'TokensFarm', tokensFarmArtifact.abi, hre.network.name);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
