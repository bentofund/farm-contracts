const hre = require("hardhat");
const Dec = require('decimal.js');
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
  // const rewardPerSecond = BigNumber.from(config.rewardTokenAmount).mul(BigNumber.from(10).pow(rewardTokenDecimals)).div(config.farmPeriod).div(secondsInDay);
  const rewardPerSecond = Dec(config.rewardTokenAmount.toString() || 0).mul(10 ** rewardTokenDecimals).div(config.farmPeriod).div(secondsInDay).floor().toFixed().toString();
  const minTimeToStake = Math.round(config.minTimeToStake * secondsInDay);
  const flatFeeAmount = Dec(config.flatFeeAmount.toString() || 0).mul(10 ** 18).floor().toFixed().toString();

  const TokensFarm = await hre.ethers.getContractFactory('TokensFarm');
  /*
        IERC20 _erc20,
        uint256 _rewardPerSecond,
        uint256 _startTime,
        uint256 _minTimeToStake,
        bool _isEarlyWithdrawAllowed,
        EarlyWithdrawPenalty _penalty,
        IERC20 _tokenStaked,
        address _congressAddress,
        uint256 _stakeFeePercent,
        uint256 _rewardFeePercent,
        uint256 _flatFeeAmount,
        address payable _feeCollector,
        bool _isFlatFeeAllowed

   */

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
