const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")

// hre: hardhat runtime enviroment
module.exports = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // we could get pricefeed dynamicaly
    let ethUsdPriceFeedAddress
    // when we are using local network we need to use mocks for pricefeed.
    if (developmentChains.includes(network.name)) {
        const ethUsdAggragator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggragator.address
    } else {
        //when using other chains we need to use theri pricefeed contracts.
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    // when going for localhost or harhat nerwork we want to use a mock(simulates the real object).
    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("==============================================")
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        //verify
        await verify(fundMe.address, args)
    }
}

module.exports.tags = ["all", "fundme"]
