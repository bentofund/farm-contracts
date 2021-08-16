//"SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokensFarm is Ownable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    enum EarlyWithdrawPenalty { BURN_REWARDS, REDISTRIBUTE_REWARDS }

    // Info of each user.
    struct StakeInfo {
        uint256 amount;             // How many tokens the user has provided.
        uint256 rewardDebt;         // Reward debt. See explanation below.
        uint256 depositTime;        // Time when user deposited.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 tokenStaked;         // Address of LP token contract.
        uint256 lastRewardTime;     // Last time number that ERC20s distribution occurs.
        uint256 accERC20PerShare;   // Accumulated ERC20s per share, times 1e36.
        uint256 totalDeposits;      // Total tokens deposited in the farm.
    }

    // If contractor allows early withdraw on stakes
    bool public isEarlyWithdrawAllowed;
    // Minimal period of time to stake
    uint256 public minTimeToStake;
    // Address of the ERC20 Token contract.
    IERC20 public erc20;
    // The total amount of ERC20 that's paid out as reward.
    uint256 public paidOut;
    // ERC20 tokens rewarded per second.
    uint256 public rewardPerSecond;
    // Total rewards added to farm
    uint256 public totalRewards;
    // Info of each pool.
    PoolInfo public pool;
    // Info of each user that stakes LP tokens.
    mapping (address => StakeInfo[]) public stakeInfo;
    // The time when farming starts.
    uint256 public startTime;
    // The time when farming ends.
    uint256 public endTime;
    // Early withdraw penalty
    EarlyWithdrawPenalty public penalty;

    // Events
    event Deposit(address indexed user, uint256 stakeId, uint256 amount);
    event Withdraw(address indexed user, uint256 stakeId, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 stakeId, uint256 amount);


    constructor(
        IERC20 _erc20, uint256 _rewardPerSecond, uint256 _startTime, uint256 _minTimeToStake, bool _isEarlyWithdrawAllowed
    ) public {
        require(address(_erc20) != address(0x0), "Wrong token address.");
        require(_rewardPerSecond > 0, "Rewards per second must be > 0.");
        require(_startTime >= block.timestamp, "Start timne can not be in the past.");

        erc20 = _erc20;
        rewardPerSecond = _rewardPerSecond;
        startTime = _startTime;
        endTime = _startTime;
        minTimeToStake = _minTimeToStake;
        isEarlyWithdrawAllowed = _isEarlyWithdrawAllowed;
    }

    // Set early withdrawal penalty, if applicable
    function setEarlyWithdrawPenalty(EarlyWithdrawPenalty _penalty) external onlyOwner {
        require(isEarlyWithdrawAllowed, "Early withdrawal is not allowed, so there is no penalty.");
        penalty = _penalty;
    }

    // Fund the farm, increase the end time
    function fund(uint256 _amount) external {
        fundInternal(_amount);
        erc20.safeTransferFrom(address(msg.sender), address(this), _amount);
    }

    // Internally fund the farm by adding farmed rewards by user to the end
    function fundInternal(uint _amount) internal {
        require(block.timestamp < endTime, "fund: too late, the farm is closed");
        require(_amount > 0, "Amount must be greater than 0.");
        // Compute new end time
        endTime += _amount.div(rewardPerSecond);
        // Increase farm total rewards
        totalRewards = totalRewards.add(_amount);
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function addPool(IERC20 _tokenStaked, bool _withUpdate) external onlyOwner {
        require(address(_tokenStaked) != address(0x0), "Must input valid address.");
        require(address(pool.tokenStaked) == address(0x0), "Pool can be set only once.");

        if (_withUpdate) {
            updatePool();
        }
        uint256 lastRewardTime = block.timestamp > startTime ? block.timestamp : startTime;

        pool = PoolInfo({
            tokenStaked: _tokenStaked,
            lastRewardTime: lastRewardTime,
            accERC20PerShare: 0,
            totalDeposits: 0
        });
    }

    // View function to see deposited LP for a user.
    function deposited(address _user, uint256 stakeId) public view returns (uint256) {
        StakeInfo storage stake = stakeInfo[_user][stakeId];
        return stake.amount;
    }

    // View function to see pending ERC20s for a user.
    function pending(address _user, uint256 stakeId) public view returns (uint256) {
        StakeInfo storage stake = stakeInfo[_user][stakeId];

        if(stake.amount == 0) {
            return 0;
        }

        uint256 accERC20PerShare = pool.accERC20PerShare;
        uint256 tokenSupply = pool.totalDeposits;

        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            uint256 lastTime = block.timestamp < endTime ? block.timestamp : endTime;
            uint256 timeToCompare = pool.lastRewardTime < endTime ? pool.lastRewardTime : endTime;
            uint256 nrOfSeconds = lastTime.sub(timeToCompare);
            uint256 erc20Reward = nrOfSeconds.mul(rewardPerSecond);
            accERC20PerShare = accERC20PerShare.add(erc20Reward.mul(1e36).div(tokenSupply));
        }

        return stake.amount.mul(accERC20PerShare).div(1e36).sub(stake.rewardDebt);
    }

    // View function to see deposit timestamp for a user.
    function depositTimestamp(address _user, uint256 stakeId) public view returns (uint256) {
        StakeInfo storage stake = stakeInfo[_user][stakeId];
        return stake.depositTime;
    }

    // View function for total reward the farm has yet to pay out.
    function totalPending() external view returns (uint256) {
        if (block.timestamp <= startTime) {
            return 0;
        }

        uint256 lastTime = block.timestamp < endTime ? block.timestamp : endTime;
        return rewardPerSecond.mul(lastTime - startTime).sub(paidOut);
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool() public {
        uint256 lastTime = block.timestamp < endTime ? block.timestamp : endTime;

        if (lastTime <= pool.lastRewardTime) {
            return;
        }

        uint256 tokenSupply = pool.totalDeposits;

        if (tokenSupply == 0) {
            pool.lastRewardTime = lastTime;
            return;
        }

        uint256 nrOfSeconds = lastTime.sub(pool.lastRewardTime);
        uint256 erc20Reward = nrOfSeconds.mul(rewardPerSecond);

        pool.accERC20PerShare = pool.accERC20PerShare.add(erc20Reward.mul(1e36).div(tokenSupply));
        pool.lastRewardTime = block.timestamp;
    }

    // Deposit LP tokens to Farm for ERC20 allocation.
    function deposit(uint256 _amount) external {
        StakeInfo memory stake;

        // Update pool
        updatePool();

        // Take token and transfer to contract
        pool.tokenStaked.safeTransferFrom(address(msg.sender), address(this), _amount);
        // Add amount to the pool total deposits
        pool.totalDeposits = pool.totalDeposits.add(_amount);

        // Update user accounting
        stake.amount = _amount;
        stake.rewardDebt = stake.amount.mul(pool.accERC20PerShare).div(1e36);
        stake.depositTime = block.timestamp;

        uint stakeId = stakeInfo[msg.sender].length;

        // Push new stake to array of stakes for user
        stakeInfo[msg.sender].push(stake);

        // Emit deposit event
        emit Deposit(msg.sender, stakeId, _amount);
    }

    // Withdraw LP tokens from Farm.
    function withdraw(uint256 _amount, uint256 stakeId) external {
        StakeInfo storage stake = stakeInfo[msg.sender][stakeId];

        require(stake.amount >= _amount, "withdraw: can't withdraw more than deposit");

        updatePool();

        bool minimalTimeStakeRespected = stake.depositTime.add(minTimeToStake) <= block.timestamp;

        // if early withdraw is not allowed, user can't withdraw funds before
        if(!isEarlyWithdrawAllowed) {
            // Check if user has respected minimal time to stake, require it.
           require(minimalTimeStakeRespected, "User can not withdraw funds yet.");
        }

        // Compute pending rewards amount of user rewards
        uint256 pendingAmount = stake.amount.mul(pool.accERC20PerShare).div(1e36).sub(stake.rewardDebt);

        // Penalties in case user didn't stake enough time
        if(penalty == EarlyWithdrawPenalty.BURN_REWARDS && !minimalTimeStakeRespected) {
            // Burn to address (1)
            erc20Transfer(address(1), pendingAmount);
        } else if (penalty == EarlyWithdrawPenalty.REDISTRIBUTE_REWARDS && !minimalTimeStakeRespected) {
            // Re-fund the farm
            fundInternal(pendingAmount);
        } else {
            // In case either there's no penalty
            erc20Transfer(msg.sender, pendingAmount);
        }


        stake.amount = stake.amount.sub(_amount);
        stake.rewardDebt = stake.amount.mul(pool.accERC20PerShare).div(1e36);

        pool.tokenStaked.safeTransfer(address(msg.sender), _amount);
        pool.totalDeposits = pool.totalDeposits.sub(_amount);

        // Emit Withdraw event
        emit Withdraw(msg.sender, stakeId, _amount);
    }


    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 stakeId) external {
        StakeInfo storage stake = stakeInfo[msg.sender][stakeId];

        pool.tokenStaked.safeTransfer(address(msg.sender), stake.amount);
        pool.totalDeposits = pool.totalDeposits.sub(stake.amount);

        emit EmergencyWithdraw(msg.sender, stakeId, stake.amount);

        stake.amount = 0;
        stake.rewardDebt = 0;
    }

    // Get number of stakes user has
    function getNumberOfUserStakes(address user) external view returns (uint256){
        return stakeInfo[user].length;
    }

    // Get user pending amounts, stakes and deposit time
    function getUserStakesAndPendingAmounts(address user) external view returns (uint256[] memory, uint256[] memory, uint256[] memory) {
        uint256 numberOfStakes = stakeInfo[user].length;

        uint256[] memory deposits = new uint256[](numberOfStakes);
        uint256[] memory pendingAmounts = new uint256[](numberOfStakes);
        uint256[] memory depositTime = new uint256[](numberOfStakes);

        for (uint i = 0; i < numberOfStakes; i++) {
            deposits[i] = deposited(user, i);
            pendingAmounts[i] = pending(user, i);
            depositTime[i] = depositTimestamp(user, i);
        }

        return (deposits, pendingAmounts, depositTime);
    }

    // Transfer ERC20 and update the required ERC20 to payout all rewards
    function erc20Transfer(address _to, uint256 _amount) internal {
        erc20.transfer(_to, _amount);
        paidOut += _amount;
    }
}
