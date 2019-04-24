pragma solidity 0.4.24;

import "./KillSwitchedApp.sol";
import "../base/SeveritiesKillSwitch.sol";


contract SeveritiesKillSwitchedApp is KillSwitchedApp, SeveritiesKillSwitch {
    function setLowestAllowedSeverity(IssuesRegistry.Severity _severity)
        external
        authP(SET_LOWEST_ALLOWED_SEVERITY_ROLE, arr(_baseApp(), msg.sender))
    {
        _setLowestAllowedSeverity(_baseApp(), _severity);
    }
}
