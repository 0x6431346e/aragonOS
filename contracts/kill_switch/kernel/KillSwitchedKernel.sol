pragma solidity 0.4.24;

import "../base/KillSwitch.sol";
import "../../kernel/Kernel.sol";


contract KillSwitchedKernel is Kernel, KillSwitch {
    string private constant ERROR_CONTRACT_CALL_NOT_ALLOWED = "KERNEL_CONTRACT_CALL_NOT_ALLOWED";

    function initialize(IssuesRegistry _issuesRegistry, IACL _baseAcl, address _permissionsCreator) public onlyInit {
        _setIssuesRegistry(_issuesRegistry);
        Kernel.initialize(_baseAcl, _permissionsCreator);
    }

    function getApp(bytes32 _namespace, bytes32 _appId) public view returns (address) {
        address _app = super.getApp(_namespace, _appId);
        bool _isCallAllowed = !shouldDenyCallingContract(_app);
        require(_isCallAllowed, ERROR_CONTRACT_CALL_NOT_ALLOWED);
        return _app;
    }
}
