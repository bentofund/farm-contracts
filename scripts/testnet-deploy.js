const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress } = require('./utils')
const { ethers, web3, upgrades } = hre

async function main() {

  const contracts = getSavedContractAddresses()[hre.network.name];

  let currentBlock = await web3.eth.getBlockNumber();
  currentBlock += 100;
  console.log('startBlock: ' + currentBlock);
  const rewardPerBlock = ethers.utils.parseEther("1.25"); //1.25 token per block

  const TokensFarm = await hre.ethers.getContractFactory('TokensFarm');
  console.log();
  const tokensFarm = await TokensFarm.deploy(contracts["HordToken"], rewardPerBlock, currentBlock);
  await tokensFarm.deployed();
  console.log('TokensFarm deployed with address: ', tokensFarm.address);
  saveContractAddress(hre.network.name, 'TokensFarm', tokensFarm.address);

  // await tokensFarm.addPool(contracts["RewardToken"], true);

  // let totalRewards = toWeiDenomination(100800)// 10 days approximately
  // const rewardToken = await hre.ethers.getContractAt("ERC20Mock", contracts["RewardToken"])
  // await rewardToken.approve(tokensFarm.address, totalRewards);
  // console.log('Approved rewards token');

  // console.log('Create new farming pool for reward token');
  // await tokensFarm.fund(totalRewards);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
