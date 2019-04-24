pragma solidity 0.4.24;

import "../../../../apps/AragonApp.sol";


contract KillSwitchedKernelAppMock is AragonApp {
    uint256 internal data;
    address internal owner;

    function initialize(address _owner) public onlyInit {
        initialized();
        data = 42;
        owner = _owner;
    }

    function appOwner() public view returns (address) {
        return owner;
    }

    function read() public view returns (uint256) {
        return data;
    }

    function write(uint256 _data) public {
        data = _data;
    }

    function reset() public {
        data = 0;
    }
}
