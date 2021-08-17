const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils')
const { ethers, web3, upgrades } = hre

async function main() {
  let contracts = getSavedContractAddresses()[hre.network.name];

  // deploy staking/reward token contract
  const RewardToken = await hre.ethers.getContractFactory('ERC20Mock');
  console.log();
  let rewardToken = await RewardToken.deploy("Reward Token", "Hord", 18, ethers.utils.parseEther("1000000000"));
  await rewardToken.deployed();
  console.log('RewardToken deployed with address: ', rewardToken.address);
  saveContractAddress(hre.network.name, 'StakingToken', rewardToken.address);
  saveContractAddress(hre.network.name, 'RewardToken', rewardToken.address);

  let rewardTokenArtifact = await hre.artifacts.readArtifact("ERC20Mock");
  saveContractAbis(hre.network.name, 'RewardToken', rewardTokenArtifact.abi, hre.network.name);


  // deploy farm contract
  contracts = getSavedContractAddresses()[hre.network.name];
  
  let currentTime = parseInt((new Date().getTime() / 1000).toFixed(0));
  currentTime += 600; // 10 mins
  const rewardPerSecond = ethers.utils.parseEther("0.1"); // 0.1 token per second
  
  const TokensFarm = await hre.ethers.getContractFactory('TokensFarm');
  console.log();
  const tokensFarm = await TokensFarm.deploy(contracts["RewardToken"], rewardPerSecond, currentTime, 1800, true); // min time to stake = 30 mins
  await tokensFarm.deployed();
  console.log('TokensFarm deployed with address: ', tokensFarm.address);
  saveContractAddress(hre.network.name, 'TokensFarm', tokensFarm.address);

  let tokensFarmArtifact = await hre.artifacts.readArtifact("TokensFarm");
  saveContractAbis(hre.network.name, 'TokensFarm', tokensFarmArtifact.abi, hre.network.name);


  // add pool and set LP token
  await tokensFarm.addPool(contracts["RewardToken"], true);


  // fund rewards
  let totalRewards = ethers.utils.parseEther("25920");  // 3 days, 0.1*60*60*24*3 = 25920
  let tokenArtifiact = await hre.artifacts.readArtifact("ERC20Mock");
  rewardToken = await hre.ethers.getContractAt(tokenArtifiact.abi, contracts["RewardToken"])
  await rewardToken.approve(tokensFarm.address, totalRewards);
  console.log('Approved rewards token');

  // console.log('Create new farming pool for reward token');
  // tokensFarm = await hre.ethers.getContractAt(tokensFarmArtifact.abi, contracts["TokensFarm"]);
  // await tokensFarm.fund(totalRewards);
  // console.log('Farm funded properly.');

  // // set penalty
  // await tokensFarm.setEarlyWithdrawPenalty(0);
  // console.log('Farm set penalty - BURN_REWARDS.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
