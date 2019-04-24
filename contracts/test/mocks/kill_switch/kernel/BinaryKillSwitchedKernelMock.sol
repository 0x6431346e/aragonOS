pragma solidity 0.4.24;

import "./KillSwitchedKernelAppMock.sol";
import "../../../../kill_switch/kernel/BinaryKillSwitchedKernel.sol";


contract BinaryKillSwitchedKernelMock is BinaryKillSwitchedKernel {
    constructor(bool _shouldPetrify) BinaryKillSwitchedKernel(_shouldPetrify) public {}

    function _shouldEvaluateCall(address _contract) internal returns (bool) {
        bytes4 methodID;
        bytes memory callData = msg.data;
        assembly { methodID := mload(add(callData, 0x20)) }
        KillSwitchedKernelAppMock app = KillSwitchedKernelAppMock(_contract);

        // if called method is #read, do not evaluate
        if (methodID == app.read.selector) return false;

        // if called method is #appOwner, do not evaluate
        if (methodID == app.appOwner.selector) return false;

        // if called method is #reset, and the sender is the owner, do not evaluate
        if (methodID == app.reset.selector && msg.sender == app.appOwner()) return false;

        // evaluate otherwise
        return true;
    }
}
