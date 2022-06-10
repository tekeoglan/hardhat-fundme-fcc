const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

// unit tests should be tested on local network
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1") // 1 ETH
          beforeEach(async function () {
              //if you don't put getNamedAccounts() into prantheses the deployer would be undefined
              deployer = (await getNamedAccounts()).deployer

              // deployments represents scripsts in deploy folder
              // ficture() uses tags as a parameter
              await deployments.fixture(["all"])

              // getContract() gets most recently deployed contract
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          // we should test constructor function too
          describe("constructor", function () {
              it("Sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              it("Fails if you don't send enough ETH", async () => {
                  // the revertedWith() messege must match with the message in the contract
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("Updated the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountOfFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Funder added to array", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", function () {
              beforeEach(async function () {
                  //before the testing of each step we need to send money to withdraw
                  await fundMe.fund({ value: sendValue })
              })
              it("withdraws ETH from a single funder", async function () {
                  //Step 1: Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  //Step 2: Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // we waited for a 1 block so we could get accurate data.
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  // we need to take gasCost into account so we could get total balance of user
                  // the mul() function is multiplieng the big numbers
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  //Step 3: Assert
                  assert.equal(endingFundMeBalance, 0)
                  // the money send into contract before the withdrawal, should return back to deployer.
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              it("allows us to withdraw with multiple s_getFunder", async function () {
                  // Arrange
                  // ethers will give us fake accounts
                  const accounts = await ethers.getSigners()
                  // we started index with 1 cause the first element of the account is deployer
                  for (let i = 1; i < 6; i++) {
                      // we'r connecting to current account
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
                  // check if the getFunder array is wiped out
                  await expect(fundMe.getFunder(0)).to.be.reverted
                  // check if each one of the getFunder's money returned back
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountOfFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })
          })
      })
