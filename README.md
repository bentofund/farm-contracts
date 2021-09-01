## TokensFarm Smart Contracts

### Developer instructions

#### Instal dependencies
`yarn install`

#### Create .env file and make sure it's having following information:
```
PK=YOUR_PRIVATE_KEY 
USERNAME=2key
```

#### Create developmentConfig.json file in developments folder and make sure it's having following information:
```
{
    network: {
        "stakingTokenAddress": Staking_Token_Address,
        "rewardTokenAddress": Reward_Token_Address,
        "startTime": Farm_Start_Time,
        "rewardTokenAmount": Reward_Token_Amount,
        "minTimeToStake": Min_Time_To_Stake (Days),
        "farmPeriod": Farm_Period (Days),
        "isEarlyWithdrawAllowed": true/false,
        "penaltyType": 0 - NO_PENALTY, 1 - BURN_REWARDS, 2 - REDISTRIBUTE_REWARDS,
        "congressAddress": Congress_Address
    }
}
```

#### Compile code
- `npx hardhat clean` (Clears the cache and deletes all artifacts)
- `npx hardhat compile` (Compiles the entire project, building all artifacts)

#### Deploy code
- `npx hardhat run --network {network} scripts/{desired_deployment_script}`

#### Deploy code example: 
- `npx hardhat run --network {network_name} scripts/1-farm.js`
- `npx hardhat run --network {network_name} scripts/2-fund-approve.js`
- `npx hardhat run --network {network_name} scripts/3-fund-reward.js`

#### Flatten contracts
- `npx hardhat flatten` (Flattens and prints contracts and their dependencies)

#### Deployed addresses and bytecodes
All deployed addresses and bytecodes can be found inside `deployments/{branch-name}-addresses.json` and `deployments/{branch-name}-abis.json` file.

