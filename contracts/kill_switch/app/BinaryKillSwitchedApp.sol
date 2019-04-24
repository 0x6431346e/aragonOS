pragma solidity 0.4.24;

import "./KillSwitchedApp.sol";
import "../base/BinaryKillSwitch.sol";


contract BinaryKillSwitchedApp is KillSwitchedApp, BinaryKillSwitch {
    function setIgnore(bool _ignored)
        external
        authP(SET_IGNORED_CONTRACTS_ROLE, arr(_baseApp(), msg.sender))
    {
        _setContractIgnore(_baseApp(), _ignored);
    }
}
