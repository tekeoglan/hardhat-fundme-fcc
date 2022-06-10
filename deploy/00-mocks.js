const { network } = require("hardhat")
const {
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
} = require("../helper-hardhat-config")

// so we have no pricefeed contract for localhost and hardhat network we have
// to mock it
module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (chainId == 31337) {
        log("Local network detcted! Deploying mocks...")
        await deploy("MockV3Aggregator", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ANSWER], // that args will go into the constructor as parameters.
        })
        log("Mocks deployed!")
    }
}

// you can only run this script with tags
// yarn hardhat deploy --tags mocks
module.exports.tags = ["all", "mocks"]
