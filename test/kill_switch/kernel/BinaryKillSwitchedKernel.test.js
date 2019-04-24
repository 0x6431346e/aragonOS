const { assertRevert } = require('../../helpers/assertThrow')

const IssuesRegistry = artifacts.require('IssuesRegistry')
const KillSwitchedKernelAppMock = artifacts.require('KillSwitchedKernelAppMock')

const ACL = artifacts.require('ACL')
const RegularKernel = artifacts.require('Kernel')
const KillSwitchedKernel = artifacts.require('BinaryKillSwitchedKernelMock')
const DAOFactory = artifacts.require('DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')

const SEVERITY = { NONE: 0, LOW: 1, MID: 2, HIGH: 3, CRITICAL: 4 }

const getEventArgument = (receipt, event, arg) => receipt.logs.find(l => l.event === event).args[arg]

contract('BinaryKillSwitchedKernel', ([_, root, owner, securityPartner, anyone]) => {
  let appBase, aclBase, issuesRegistryBase, registryFactory, regularDao, regularAcl, killSwitchedDao, killSwitchedAcl, issuesRegistry, app

  before('deploy base implementations', async () => {
    aclBase = await ACL.new()
    appBase = await KillSwitchedKernelAppMock.new()
    issuesRegistryBase = await IssuesRegistry.new()
    registryFactory = await EVMScriptRegistryFactory.new()
  })

  before('deploy DAO with regular kernel', async () => {
    // deploy dao factory with regular kernel
    const regularKernelBase = await RegularKernel.new(true) // petrify immediately
    const regularDaoFactory = await DAOFactory.new(regularKernelBase.address, aclBase.address, registryFactory.address)

    // deploy dao using regular kernel
    const regularKernelReceipt = await regularDaoFactory.newDAO(root)
    regularDao = RegularKernel.at(getEventArgument(regularKernelReceipt, 'DeployDAO', 'dao'))
    regularAcl = ACL.at(await regularDao.acl())

    // create permissions
    const APP_MANAGER_ROLE = await regularKernelBase.APP_MANAGER_ROLE()
    await regularAcl.createPermission(root, regularDao.address, APP_MANAGER_ROLE, root, { from: root })
  })

  beforeEach('deploy issues registry app from DAO with regular kernel', async () => {
    const issuesRegistryReceipt = await regularDao.newAppInstance('0x1234', issuesRegistryBase.address, '0x', false, { from: root })
    issuesRegistry = IssuesRegistry.at(getEventArgument(issuesRegistryReceipt, 'NewAppProxy', 'proxy'))
    await issuesRegistry.initialize()
    const SET_ENTRY_SEVERITY_ROLE = await issuesRegistryBase.SET_ENTRY_SEVERITY_ROLE()
    await regularAcl.createPermission(securityPartner, issuesRegistry.address, SET_ENTRY_SEVERITY_ROLE, root, { from: root })
  })

  beforeEach('deploy DAO with binary kill-switched kernel', async () => {
    // deploy dao factory with regular kernel
    const killSwitchedKernelBase = await KillSwitchedKernel.new(true) // petrify immediately
    const killSwitchedDaoFactory = await DAOFactory.new(killSwitchedKernelBase.address, aclBase.address, registryFactory.address)

    // deploy dao using regular kernel
    const killSwitchedKernelReceipt = await killSwitchedDaoFactory.newDAOWithKillSwitch(root, issuesRegistry.address)
    killSwitchedDao = KillSwitchedKernel.at(getEventArgument(killSwitchedKernelReceipt, 'DeployDAO', 'dao'))
    killSwitchedAcl = ACL.at(await killSwitchedDao.acl())

    // create permissions
    const APP_MANAGER_ROLE = await killSwitchedKernelBase.APP_MANAGER_ROLE()
    await killSwitchedAcl.createPermission(root, killSwitchedDao.address, APP_MANAGER_ROLE, root, { from: root })

    const SET_IGNORED_CONTRACTS_ROLE = await killSwitchedDao.SET_IGNORED_CONTRACTS_ROLE()
    await killSwitchedAcl.createPermission(owner, killSwitchedDao.address, SET_IGNORED_CONTRACTS_ROLE, root, { from: root })
  })

  beforeEach('deploy sample app from DAO with binary kill-switched kernel', async () => {
    const appReceipt = await killSwitchedDao.newAppInstance('0x1235', appBase.address, '0x', false, { from: root })
    app = KillSwitchedKernelAppMock.at(getEventArgument(appReceipt, 'NewAppProxy', 'proxy'))
    await app.initialize(owner)
  })

  context('when the function being called is not evaluated', () => {
    const itExecutesTheCall = () => {
      it('executes the call', async () => {
        assert.equal(await app.read(), 42)
      })
    }

    context('when there is no bug registered', () => {
      context('when the contract being called is not ignored', () => {
        itExecutesTheCall()
      })

      context('when the contract being called is ignored', () => {
        beforeEach('ignore calling contract', async () => {
          await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
        })

        itExecutesTheCall()
      })
    })
    
    context('when there is a bug registered', () => {
      beforeEach('register a bug', async () => {
        await issuesRegistry.setSeverityFor(appBase.address, SEVERITY.LOW, { from: securityPartner })
      })

      context('when the contract being called is not ignored', () => {
        itExecutesTheCall()
      })

      context('when the contract being called is ignored', () => {
        beforeEach('ignore calling contract', async () => {
          await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
        })

        itExecutesTheCall()
      })
    })
  })

  describe('when the function being called is evaluated', () => {
    describe('when the function being called is always evaluated', () => {
      const itExecutesTheCall = (from = owner) => {
        it('executes the call', async () => {
          await app.write(10, { from })
          assert.equal(await app.read(), 10)
        })
      }

      const itDoesNotExecuteTheCall = (from = owner) => {
        it('does not execute the call', async () => {
          await assertRevert(app.write(10, { from }), 'KERNEL_CONTRACT_CALL_NOT_ALLOWED')
        })
      }

      context('when there is no bug registered', () => {
        context('when the contract being called is not ignored', () => {
          itExecutesTheCall()
        })

        context('when the contract being called is ignored', () => {
          beforeEach('ignore calling contract', async () => {
            await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
          })

          itExecutesTheCall()
        })
      })

      context('when there is a bug registered', () => {
        beforeEach('register a bug', async () => {
          await issuesRegistry.setSeverityFor(appBase.address, SEVERITY.LOW, { from: securityPartner })
        })

        context('when the bug was not fixed yet', () => {
          context('when the contract being called is not ignored', () => {
            context('when the sender is the owner', () => {
              itDoesNotExecuteTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itDoesNotExecuteTheCall(anyone)
            })
          })

          context('when the contract being called is ignored', () => {
            beforeEach('ignore calling contract', async () => {
              await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
            })

            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })
        })

        context('when the bug was already fixed', () => {
          beforeEach('fix bug', async () => {
            await issuesRegistry.setSeverityFor(appBase.address, SEVERITY.NONE, { from: securityPartner })
          })

          context('when the contract being called is not ignored', () => {
            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })

          context('when the contract being called is ignored', () => {
            beforeEach('ignore calling contract', async () => {
              await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
            })

            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })
        })
      })
    })

    describe('when the function being called is evaluated only when sender is not the owner', () => {
      const itExecutesTheCall = (from = owner) => {
        it('executes the call', async () => {
          await app.reset({ from })
          assert.equal(await app.read(), 0)
        })
      }

      const itDoesNotExecuteTheCall = (from = owner) => {
        it('does not execute the call', async () => {
          await assertRevert(app.reset({ from }), 'KERNEL_CONTRACT_CALL_NOT_ALLOWED')
        })
      }

      context('when there is no bug registered', () => {
        context('when the contract being called is not ignored', () => {
          itExecutesTheCall()
        })

        context('when the contract being called is ignored', () => {
          beforeEach('ignore calling contract', async () => {
            await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
          })

          itExecutesTheCall()
        })
      })

      context('when there is a bug registered', () => {
        beforeEach('register a bug', async () => {
          await issuesRegistry.setSeverityFor(appBase.address, SEVERITY.LOW, { from: securityPartner })
        })

        context('when the bug was not fixed yet', () => {
          context('when the contract being called is not ignored', () => {
            context('when the sender is the owner', () => {
              // itExecutesTheCall(owner)

              it('executes the call', async () => {
                assert.equal(await app.read(), 42)
              })
            })

            context('when the sender is not the owner', () => {
              itDoesNotExecuteTheCall(anyone)
            })
          })

          context('when the contract being called is ignored', () => {
            beforeEach('ignore calling contract', async () => {
              await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
            })

            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })
        })

        context('when the bug was already fixed', () => {
          beforeEach('fix bug', async () => {
            await issuesRegistry.setSeverityFor(appBase.address, SEVERITY.NONE, { from: securityPartner })
          })

          context('when the contract being called is not ignored', () => {
            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })

          context('when the contract being called is ignored', () => {
            beforeEach('ignore calling contract', async () => {
              await killSwitchedDao.setContractIgnore(appBase.address, true, { from: owner })
            })

            context('when the sender is the owner', () => {
              itExecutesTheCall(owner)
            })

            context('when the sender is not the owner', () => {
              itExecutesTheCall(anyone)
            })
          })
        })
      })
    })
  })
})
