const hre = require("hardhat");
const Dec = require('decimal.js');
const { saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

async function main() {
  const config = c[hre.network.name];
  console.log('config: ', config);

  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Mock");
  const rewardToken = await hre.ethers.getContractAt(erc20Artifact.abi, config.rewardTokenAddress);

  const secondsInDay = 24*60*60;
  const rewardTokenDecimals = await rewardToken.decimals();
  // const rewardPerSecond = BigNumber.from(config.rewardTokenAmount).mul(BigNumber.from(10).pow(rewardTokenDecimals)).div(config.farmPeriod).div(secondsInDay);
  const rewardPerSecond = Dec(config.rewardTokenAmount.toString() || 0).mul(10 ** rewardTokenDecimals).div(config.farmPeriod).div(secondsInDay).floor().toFixed().toString();
  const minTimeToStake = Math.round(config.minTimeToStake * secondsInDay);
  const flatFeeAmount = Dec(config.flatFeeAmount.toString() || 0).mul(10 ** 18).floor().toFixed().toString();

  const TokensFarm = await hre.ethers.getContractFactory('TokensFarm');

  const constructorParams = {
    rewardTokenAddress: config.rewardTokenAddress,
    rewardPerSecond: rewardPerSecond,
    startTime: config.startTime,
    minTimeToStake: minTimeToStake,
    isEarlyWithdrawAllowed: config.isEarlyWithdrawAllowed,
    penaltyType: config.penaltyType,
    stakingTokenAddress: config.stakingTokenAddress,
    congressAddress: config.congressAddress,
    stakeFeePercent: config.stakeFeePercent,
    rewardFeePercent: config.rewardFeePercent,
    flatFeeAmount: flatFeeAmount,
    feeCollector: config.feeCollector,
    isFlatFeeAllowed: config.isFlatFeeAllowed,
  };
  console.log('constructorParams: ', constructorParams); // for verify contract source code

  const tokensFarm = await TokensFarm.deploy(
    config.rewardTokenAddress,
    rewardPerSecond,
    config.startTime,
    minTimeToStake,
    config.isEarlyWithdrawAllowed,
    config.penaltyType,
    config.stakingTokenAddress,
    config.congressAddress,
    config.stakeFeePercent,
    config.rewardFeePercent,
    flatFeeAmount,
    config.feeCollector,
    config.isFlatFeeAllowed,
  );
  await tokensFarm.deployed();
  console.log('TokensFarm deployed with address: ', tokensFarm.address);
  saveContractAddress(hre.network.name, 'TokensFarm', tokensFarm.address);
  saveContractAddress(hre.network.name, 'StakingToken', config.stakingTokenAddress);
  saveContractAddress(hre.network.name, 'RewardToken', config.rewardTokenAddress);

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
