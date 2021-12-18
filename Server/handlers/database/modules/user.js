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
  REF: "APP_USERS2",
  prefix: "usr"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.UID || !payload.username || !payload.DOB) return false
    if (await CModule.functions.isUsernameExisting(payload.username)) return {status: "auth/username-already-exists"}

    try {
      (await CModule.REF.create(payload))
    } catch(error) {
      return {status: "auth/failed"}
    }
    const dependencies = Object.entries(CModule.dependencies)
    for (const dependency in dependencies) {
      if (dependencies[dependency][1].functions && dependencies[dependency][1].functions.constructor) await dependencies[dependency][1].functions.constructor(CModule.functions.getDependencyREF(dependencies[dependency][0], payload.UID))
    }
    return {success: true, status: "auth/successful"}
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isUserExisting(UID)) return false

    await moduleDependencies.server.query(`DELETE FROM ${CModule.REF} WHERE "UID" = '${UID}'`)
    for (const dependency in dependencies) {
      if (dependencies[dependency][1].functions && dependencies[dependency][1].functions.constructor) await moduleDependencies.server.query(`DROP TABLE IF EXISTS ${CModule.functions.getDependencyREF(dependencies[dependency][0], UID)}`)
    }
    return true
  },

  getDependencyREF: function(dependency, UID) {
    if (!dependency || !CModule.dependencies[dependency] || !CModule.dependencies[dependency].functions || !CModule.dependencies[dependency].functions.constructor || !UID) return false

    return "\"" + CModule.prefix + "_" + UID + "_" + CModule.dependencies[dependency].suffix + "\""
  },

  getRoomREF: function(UID) {
    if (!UID) return false

    return CModule.prefix + "_" + UID
  },

  isUserExisting: async function(UID, fetchData, fetchPassword) {
    if (!UID) return false

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
    suffix: "cntcs",
    types: ["friends", "pending", "blocked"],
    functions: {
      constructor: function(REF) {
        return moduleDependencies.server.define(REF, {
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
        }, {})
      },

      fetchContact: async function(UID, contactUID) {
        if (!await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
      
        const queryResult = await moduleDependencies.driver.query('SELECT * FROM ? WHERE UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID],
          type: moduleDependencies.driver.QueryTypes.SELECT
        })
        return moduleDependencies.utils.fetchSoloResult(queryResult)
      },

      fetchContacts: async function(UID, type) {
        if (!await CModule.functions.isUserExisting(UID)) return false
        if (type && (CModule.dependencies.contacts.types.indexOf(type) == -1)) return false

        if (type) {
          var queryResult = false
          try {
            queryResult = await moduleDependencies.driver.query('SELECT * FROM ? WHERE type = ?', {
              replacements: [CModule.functions.getDependencyREF("contacts", UID), type],
              type: moduleDependencies.driver.QueryTypes.SELECT
            })
          } catch(error) {}
          return queryResult || false
        }

        var queryResult = await moduleDependencies.driver.query('SELECT * FROM ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID)],
          type: moduleDependencies.driver.QueryTypes.SELECT
        })
        if (queryResult && (queryResult.length > 0)) {
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

        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        await moduleDependencies.driver.query('INSERT INTO ? UID = ? type = ? group = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID, "friends", groupUID],
          type: moduleDependencies.driver.QueryTypes.INSERT
        })
        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", contactUID), UID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        await moduleDependencies.driver.query('INSERT INTO ? UID = ? type = ? group = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", contactUID), UID, "friends", groupUID],
          type: moduleDependencies.driver.QueryTypes.INSERT
        })
        return true
      },

      removeContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "friends") return false 

        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", contactUID), UID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        return true
      },

      blockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type == "blocked") return false 

        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        await moduleDependencies.driver.query('INSERT INTO ? UID = ? type = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID, "blocked"],
          type: moduleDependencies.driver.QueryTypes.INSERT
        })
        queryResult = await CModule.dependencies.contacts.functions.fetchContact(contactUID, UID)
        if (queryResult && (queryResult.type != "blocked")) {
          await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
            replacements: [CModule.functions.getDependencyREF("contacts", contactUID), UID],
            type: moduleDependencies.driver.QueryTypes.DELETE
          })
        }
        return true
      },

      unblockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "blocked") return false 

        await moduleDependencies.driver.query('DELETE FROM ? UID = ?', {
          replacements: [CModule.functions.getDependencyREF("contacts", UID), contactUID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        return true
      }
    }
  },

  servers: {
    suffix: "srvrs",
    functions: {
      constructor: function(REF) {
        return moduleDependencies.server.define(REF, {
          "group": {
            type: moduleDependencies.driver.BIGINT,
            unique: true
          }
        }, {})
      },

      fetchServerGroups: async function(UID) {
        if (!await CModule.functions.isUserExisting(UID)) return false

        const queryResult = await moduleDependencies.driver.query('SELECT * FROM ?', {
          replacements: [CModule.functions.getDependencyREF("servers", UID)],
          type: moduleDependencies.driver.QueryTypes.SELECT
        })
        if (!queryResult) return false
        const fetchedGroups = []
        queryResult.rows.forEach(function(groupData) {
          fetchedGroups.push({
            UID: groupData.group
          })
        })
        return fetchedGroups
      },

      isUserServerMember: async function(UID, serverUID) {
        if (!await CModule.functions.isUserExisting(UID)) return false

        var queryResult = await moduleDependencies.driver.query('SELECT * FROM ? WHERE server = ?', {
          replacements: [CModule.functions.getDependencyREF("servers", UID), serverUID],
          type: moduleDependencies.driver.QueryTypes.SELECT
        })
        queryResult = moduleDependencies.driver.fetchSoloResult(queryResult)
        return (queryResult && true) || false
      },

      joinServer: async function(UID, serverUID) {
        if (await CModule.dependencies.servers.functions.isUserServerMember(UID, serverUID)) return false

        await moduleDependencies.driver.query('INSERT INTO ? server = ?', {
          replacements: [CModule.functions.getDependencyREF("servers", UID), serverUID],
          type: moduleDependencies.driver.QueryTypes.INSERT
        })
        return true
      },

      leaveServer: async function(UID, serverUID) {
        if (!await CModule.dependencies.servers.functions.isUserServerMember(UID, serverUID)) return false

        await moduleDependencies.driver.query('DELETE FROM ? server = ?', {
          replacements: [CModule.functions.getDependencyREF("servers", UID), serverUID],
          type: moduleDependencies.driver.QueryTypes.DELETE
        })
        return true
      }
    }
  }
}


/*---------------------
-- Module's Injector --
---------------------*/

exports.injectModule = function(databaseModule, databaseInstances) {
  moduleDependencies.driver = databaseModule.databaseDriver
  moduleDependencies.server = databaseModule.databaseServer
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule

  CModule.REF = moduleDependencies.server.define(CModule.REF, {
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
    },
  }, {})
}