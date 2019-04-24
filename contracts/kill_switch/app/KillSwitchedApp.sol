pragma solidity 0.4.24;

import "../base/KillSwitch.sol";
import "../../apps/AragonApp.sol";
import "../../kernel/KernelConstants.sol";


contract KillSwitchedApp is AragonApp, KillSwitch {
    string private constant ERROR_CONTRACT_CALL_NOT_ALLOWED = "APP_CONTRACT_CALL_NOT_ALLOWED";

    modifier killSwitched {
        bool _isCallAllowed = !shouldDenyCallingContract(_baseApp());
        require(_isCallAllowed, ERROR_CONTRACT_CALL_NOT_ALLOWED);
        _;
    }

    function initialize(IssuesRegistry _issuesRegistry) public onlyInit {
        initialized();
        _setIssuesRegistry(_issuesRegistry);
    }

    function _baseApp() internal view returns (address) {
        return kernel().getApp(KERNEL_APP_BASES_NAMESPACE, appId());
    }
}
