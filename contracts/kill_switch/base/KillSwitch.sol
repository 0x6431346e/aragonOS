pragma solidity 0.4.24;

import "./IssuesRegistry.sol";


contract KillSwitch {
    IssuesRegistry public issuesRegistry;

    event IssuesRegistrySet(address issuesRegistry, address sender);

    function shouldDenyCallingContract(address _contract) public returns (bool) {

        // if the issues registry has not been set, then allow given call
        if (issuesRegistry == address(0)) return false;

        // if the contract call should not be evaluated, then allow given call
        if (!_shouldEvaluateCall(_contract)) return false;

        // if the contract issues are ignored, then allow given call
        if (_isContractIgnored(_contract)) return false;

        // if the contract severity found is ignored, then allow given call
        IssuesRegistry.Severity _severityFound = issuesRegistry.getSeverityFor(_contract);
        if (_isSeverityIgnored(_contract, _severityFound)) return false;

        // if none of the conditions above were met, then deny given call
        return true;
    }

    /**
     * @dev Custom function to allow different kill-switch implementations to provide a custom logic to tell whether a
     *      certain call should be denied or not. This is important to ensure recoverability. For example, custom
     *      implementations could override this function to provide a decision based on the msg.sender, msg.data,
     *      timestamp, block information, among many other options.
     * @return Always true by default.
     */
    function _shouldEvaluateCall(address /*_contract*/) internal returns (bool) {
        return true;
    }

    function _isContractIgnored(address _contract) internal view returns (bool);

    function _isSeverityIgnored(address _contract, IssuesRegistry.Severity _severity) internal view returns (bool);

    function _setIssuesRegistry(IssuesRegistry _issuesRegistry) internal {
        issuesRegistry = _issuesRegistry;
        emit IssuesRegistrySet(_issuesRegistry, msg.sender);
    }
}
