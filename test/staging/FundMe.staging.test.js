const { assert } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const {
    isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains } = require("../../helper-hardhat-config")

// staging tests are final tests run on testnet.
// describe.skip skips the all describe methods
developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe staging tests", async function () {
          let fundMe
          let deployer
          const sendValue = ethers.utils.parseEther("1")
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              fundMe = await ethers.getContract("FundeMe", deployer)
          })
          it("allows people to fund and withdraw", async function () {
              await fundMe.fund({ value: sendValue })
              await fundMe.cheaperWithdraw()
              const endingFundMeBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              assert.equal(endingFundMeBalance.toString(), "0")
          })
      })
