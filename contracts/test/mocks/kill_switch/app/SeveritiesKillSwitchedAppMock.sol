pragma solidity 0.4.24;

import "../../../../kill_switch/app/SeveritiesKillSwitchedApp.sol";


contract SeveritiesKillSwitchedAppMock is SeveritiesKillSwitchedApp {
    uint256 internal data;
    address internal owner;

    function initialize(IssuesRegistry _issuesRegistry, address _owner) public onlyInit {
        super.initialize(_issuesRegistry);
        data = 42;
        owner = _owner;
    }

    function read() public view returns (uint256) {
        return data;
    }

    function write(uint256 _data) public killSwitched {
        data = _data;
    }

    function reset() public killSwitched {
        data = 0;
    }

    function _shouldEvaluateCall(address _contract) internal returns (bool) {
        bytes4 methodID;
        bytes memory callData = msg.data;
        assembly { methodID := mload(add(callData, 0x20)) }
        SeveritiesKillSwitchedAppMock app = SeveritiesKillSwitchedAppMock(_contract);

        // if called method is #reset, and the sender is the owner, do not evaluate
        if (methodID == app.reset.selector && msg.sender == owner) return false;

        // evaluate otherwise
        return true;
    }
}
