/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: modules: user.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: User Module
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const utilityHandler = require("../../utility")
const instanceHandler = require("../../app/instance")


/*----------
-- Module --
----------*/

const moduleName = "user", moduleDependencies = {}
const CModule = {
  REF: "APP_USERS",
  prefix: "usr"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.UID || !payload.username || !payload.DOB) return false
    if (await CModule.functions.isUsernameExisting(payload.username)) return {status: "auth/username-already-exists"}

    await CModule.isModuleLoaded
    try {
      (await CModule.REF.create(payload))
    } catch(error) {
      return {status: "auth/failed"}
    }
    const dependencies = Object.entries(CModule.dependencies)
    for (const dependency in dependencies) {
      if (dependencies[dependency][1].functions && dependencies[dependency][1].functions.constructor) {
        await dependencies[dependency][1].functions.constructor(CModule.functions.getInstanceSchema(payload.UID), false)
      }
    }
    return {success: true, status: "auth/successful"}
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isUserExisting(UID)) return false

    await CModule.isModuleLoaded
    await CModule.REF.destroy({
      where: {
        UID: UID
      }
    })
    await moduleDependencies.driver.destroySchema(CModule.functions.getInstanceSchema(UID))
    return true
  },

  getInstanceSchema: function(UID) {
    return "\"" + CModule.prefix + "_" + UID + "\""
  },

  getRoomREF: function(UID) {
    if (!UID) return false

    return CModule.prefix + "_" + UID
  },

  isUserExisting: async function(UID, fetchData, fetchPassword) {
    if (!UID) return false

    await CModule.isModuleLoaded
    var queryResult = await CModule.REF.findAll({
      where: {
        UID: UID
      }
    })
    queryResult = moduleDependencies.driver.fetchSoloResult(queryResult)
    if (fetchData) {
      if (queryResult) {
        if (!fetchPassword) delete queryResult.password
        queryResult.isOnline = (instanceHandler.getInstancesByUID(UID) && true) || false
      }
      return queryResult
    }
    else return (queryResult && true) || false
  },

  isUsernameExisting: async function(username, fetchData) {
    if (!username) return false

    await CModule.isModuleLoaded
    var queryResult = await CModule.REF.findAll({
      where: {
        username: username
      }
    })
    queryResult = moduleDependencies.driver.fetchSoloResult(queryResult)
    if (fetchData) return queryResult
    else return (queryResult && true) || false
  }
}


/*-------------------------
-- Module's Dependencies --
-------------------------*/

CModule.dependencies = {
  contacts: {
    types: ["friends", "pending", "blocked"],
    functions: {
      constructor: function(schema, skipSync) {
        return moduleDependencies.driver.createREF("contacts", skipSync, {
          "UID": {
            type: moduleDependencies.driver.TEXT,
            primaryKey: true
          },
          "type": {
            type: moduleDependencies.driver.TEXT,
            allowNull: false
          },
          "group": {
            type: moduleDependencies.driver.BIGINT,
            unique: true
          }
        }, {
          schema: schema
        })
      },

      fetchContact: async function(UID, contactUID) {
        if (!await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
      
        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        const queryResult = await REF.findAll({
          where: {
            UID: contactUID
          }
        })
        return moduleDependencies.driver.fetchSoloResult(queryResult)
      },

      fetchContacts: async function(UID, type) {
        if (!await CModule.functions.isUserExisting(UID)) return false
        if (type && (CModule.dependencies.contacts.types.indexOf(type) == -1)) return false

        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        if (type) {
          const queryResult = await REF.findAll({
            where: {
              type: type
            }
          })
          return queryResult || false
        }
        var queryResult = await REF.findAll()
        if (moduleDependencies.driver.fetchSoloResult(queryResult)) {
          queryResult = utilityHandler.lodash.groupBy(queryResult, function(contactData) {
            const _type = contactData.type
            delete contactData.type
            return _type
          })
        }
        const fetchedContacts = {}
        CModule.dependencies.contacts.types.forEach(function(contactInstance) {
          fetchedContacts[contactInstance] = (queryResult && queryResult[contactInstance]) || {}
        })
        return fetchedContacts
      },

      fetchPersonalGroups: async function(UID) {
        const queryResult = await CModule.dependencies.contacts.functions.fetchContacts(UID, "friends")
        if (!queryResult) return false

        const fetchedGroups = []
        Object.entries(queryResult).forEach(function(contactData) {
          fetchedGroups.push({
            UID: contactData[1].group,
            participantUID: contactData[1].UID
          })
        })
        return fetchedGroups
      },

      addContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "pending") return false 
        const groupUID = await moduleDependencies.instances.personalGroup.functions.constructor({
          senderUID: contactUID,
          receiverUID: UID
        })
        if (!groupUID) return false

        await CModule.isModuleLoaded
        var REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.destroy({
          where: {
            UID: contactUID
          }
        })
        await REF.create({
          where: {
            UID: contactUID,
            type: "friends",
            group: groupUID
          }
        })
        REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(contactUID), true)
        await REF.destroy({
          where: {
            UID: UID
          }
        })
        await REF.create({
          where: {
            UID: UID,
            type: "friends",
            group: groupUID
          }
        })
        return true
      },

      removeContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "friends") return false 

        await CModule.isModuleLoaded
        var REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.destroy({
          where: {
            UID: contactUID
          }
        })
        REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(contactUID), true)
        await REF.destroy({
          where: {
            UID: UID
          }
        })
        return true
      },

      blockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type == "blocked") return false 

        await CModule.isModuleLoaded
        var REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.destroy({
          where: {
            UID: contactUID
          }
        })
        await REF.create({
          where: {
            UID: contactUID,
            type: "blocked"
          }
        })
        queryResult = await CModule.dependencies.contacts.functions.fetchContact(contactUID, UID)
        if (queryResult && (queryResult.type != "blocked")) {
          REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(contactUID), true)
          await REF.destroy({
            where: {
              UID: UID
            }
          })
        }
        return true
      },

      unblockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "blocked") return false 

        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.contacts.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.destroy({
          where: {
            UID: contactUID
          }
        })
        return true
      }
    }
  },

  /*
  serverGroups: {
    functions: {
      constructor: function(schema, skipSync) {
        return moduleDependencies.driver.createREF("serverGroups", skipSync, {
          "group": {
            type: moduleDependencies.driver.BIGINT,
            unique: true
          }
        }, {
          schema: schema
        })
      },

      fetchGroups: async function(UID) {
        if (!await CModule.functions.isUserExisting(UID)) return false

        const REF = await CModule.dependencies.serverGroups.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        const queryResult = await REF.findAll({})
        const fetchedGroups = []
        queryResult.rows.forEach(function(groupData) {
          fetchedGroups.push({
            UID: groupData.group
          })
        })
        return fetchedGroups
      },

      isGroupMember: async function(UID, groupUID) {
        if (!await CModule.functions.isUserExisting(UID)) return false

        const REF = await CModule.dependencies.serverGroups.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        const queryResult = await REF.findAll({
          where: {
            group: groupUID
          }
        })
        return (moduleDependencies.driver.fetchSoloResult(queryResult) && true) || false
      },

      joinGroup: async function(UID, groupUID) {
        if (await CModule.dependencies.serverGroups.functions.isGroupMember(UID, groupUID)) return false

        const REF = await CModule.dependencies.serverGroups.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.create({
          where: {
            group: groupUID,
          }
        })
        return true
      },

      leaveGroup: async function(UID, groupUID) {
        if (!await CModule.dependencies.serverGroups.functions.isGroupMember(UID, groupUID)) return false

        const REF = await CModule.dependencies.serverGroups.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        await REF.destroy({
          where: {
            group: groupUID
          }
        })
        return true
      }
    }
  }
  */
}


/*---------------------
-- Module's Injector --
---------------------*/

exports.injectModule = function(databaseModule, databaseInstances) {
  moduleDependencies.driver = databaseModule.databaseDriver
  moduleDependencies.server = databaseModule.databaseServer
  moduleDependencies.defaultSchema = databaseModule.defaultSchema
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule

  CModule.isModuleLoaded = new Promise(async function(resolve) {
    await moduleDependencies.server.isAuthorized
    CModule.REF = await moduleDependencies.driver.createREF(CModule.REF, false, {
      "UID": {
        type: moduleDependencies.driver.TEXT,
        primaryKey: true
      },
      "email": {
        type: moduleDependencies.driver.TEXT,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      "username": {
        type: moduleDependencies.driver.TEXT,
        unique: true,
        allowNull: false
      },
      "DOB": {
        type: moduleDependencies.driver.DATE,
        allowNull: false
      }
    }, {
      schema: moduleDependencies.defaultSchema
    })
    resolve()
  })
}