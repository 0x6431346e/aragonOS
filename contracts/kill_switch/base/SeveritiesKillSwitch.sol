pragma solidity 0.4.24;

import "./KillSwitch.sol";
import "./IssuesRegistry.sol";


contract SeveritiesKillSwitch is KillSwitch {
    bytes32 constant public SET_LOWEST_ALLOWED_SEVERITY_ROLE = keccak256("SET_LOWEST_ALLOWED_SEVERITY_ROLE");

    mapping (address => IssuesRegistry.Severity) internal lowestAllowedSeverityByContract;

    event LowestAllowedSeveritySet(address indexed _contract, IssuesRegistry.Severity severity);

    function _isContractIgnored(address _contract) internal view returns (bool) {
        return lowestAllowedSeverityByContract[_contract] == IssuesRegistry.Severity.None;
    }

    function _isSeverityIgnored(address _contract, IssuesRegistry.Severity _severity) internal view returns (bool) {
        IssuesRegistry.Severity lowestAllowedSeverity = lowestAllowedSeverityByContract[_contract];
        return lowestAllowedSeverity > _severity;
    }

    function _setLowestAllowedSeverity(address _contract, IssuesRegistry.Severity _severity) internal {
        lowestAllowedSeverityByContract[_contract] = _severity;
        emit LowestAllowedSeveritySet(_contract, _severity);
    }
}