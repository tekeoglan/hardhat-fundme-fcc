// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PriceConverter.sol";

error FundMe__NotOwner();

contract FundMe {
    // we can call now priceConverter functions with uint256 values.
    using PriceConverter for uint256;
    // constant and immutable veriables are much gas efficient.
    uint256 public constant MINUMUM_USD = 50 * 10**18;

    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountOfFunded;
    address private immutable i_owner;

    AggregatorV3Interface private s_priceFeed;

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        // The underscore represents here is the rest of the code.
        _;
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // In order to send or withdraw money with function you need to mark the
    // function by payable keyword.
    function fund() public payable {
        // msg.value got used into getConversionRate as firstparameter.
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINUMUM_USD,
            "You need to spend more ETH!"
        );
        s_funders.push(msg.sender);
        s_addressToAmountOfFunded[msg.sender] = msg.value;
    }

    function withdraw() public onlyOwner {
        for (uint256 i = 0; i < s_funders.length; i++) {
            address funder = s_funders[i];
            s_addressToAmountOfFunded[funder] = 0;
        }
        // reset the array
        s_funders = new address[](0);

        // 3 steps for withdrawing the funds
        // 1.transfering
        // payable(msg.sender).transfer(address(thsi).balance);
        // you need to cast address to payable so you could use transfer functions alike.
        // if transfers fails, program will throw an error and return back the money.
        // 2.sending
        // bool success = payable(msg.sender).send(address(this).balance);
        // require(success, "Sending failed");
        // when you use send method, method will return bool then you use it with
        // require function to return back the money.
        // 3.calling (recomended)
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "call failed");
    }

    // we need to make withdraw function much gas efficient
    function cheaperWithdraw() public payable onlyOwner {
        // mapping can't be in memory
        // we read the funders once cause reading and writing the storage
        // cost much higher gas
        address[] memory funders = s_funders;
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            s_addressToAmountOfFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool success, ) = i_owner.call{value: address(this).balance}("");
        require(success);
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountOfFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountOfFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }

    // sending money without fund method.
    receive() external payable {
        fund();
    }

    // receiving money with data.
    fallback() external payable {
        fund();
    }
}
