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
  REF: "\"APP_USERS\"",
  prefix: "usr"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.UID || !payload.username || !payload.DOB) return false
    const preparedQuery = moduleDependencies.utils.prepareQuery(payload)
    if (await CModule.functions.isUsernameExisting(payload.username)) return {status: "auth/username-already-exists"}

    const queryResult = await moduleDependencies.server.query(`INSERT INTO ${CModule.REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
    if (!queryResult) return {status: "auth/failed"}
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

    var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.REF} WHERE "UID" = '${UID}'`)
    if (fetchData) {
      queryResult = moduleDependencies.utils.fetchSoloResult(queryResult)
      if (queryResult) {
        if (!fetchPassword) delete queryResult.password
        queryResult.isOnline = (instanceHandler.getInstancesByUID(UID) && true) || false
      }
      return queryResult
    }
    else return (queryResult && (queryResult.rows.length > 0)) || false
  },

  isUsernameExisting: async function(username, fetchData) {
    if (!username) return false

    const queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.REF} WHERE "username" = '${username}'`)
    if (fetchData) return moduleDependencies.utils.fetchSoloResult(queryResult)
    else return (queryResult && (queryResult.rows.length > 0)) || false
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
        return moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${REF}("UID" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "group" BIGINT UNIQUE, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
      },

      fetchContact: async function(UID, contactUID) {
        if (!await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
      
        var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${contactUID}'`)
        return moduleDependencies.utils.fetchSoloResult(queryResult)
      },

      fetchContacts: async function(UID, type) {
        if (!await CModule.functions.isUserExisting(UID)) return false
        if (type && (CModule.dependencies.contacts.types.indexOf(type) == -1)) return false

        if (type) {
          var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "type" = '${type}'`)
          return (queryResult && queryResult.rows) || false
        }
        var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.functions.getDependencyREF("contacts", UID)}`)
        if (queryResult && (queryResult.rows.length > 0)) {
          queryResult = utilityHandler.lodash.groupBy(queryResult.rows, function(contactData) {
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

      addContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "pending") return false 
        const groupUID = await moduleDependencies.instances.personalGroup.functions.constructor({
          senderUID: contactUID,
          receiverUID: UID
        })
        if (!groupUID) return false

        var preparedQuery = moduleDependencies.utils.prepareQuery({
          UID: contactUID,
          type: "friends",
          group: groupUID
        })
        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${contactUID}'`)
        await moduleDependencies.server.query(`INSERT INTO ${CModule.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)

        var preparedQuery = moduleDependencies.utils.prepareQuery({
          UID: UID,
          type: "friends",
          group: groupUID
        })
        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", contactUID)} WHERE "UID" = '${UID}'`)
        await moduleDependencies.server.query(`INSERT INTO ${CModule.functions.getDependencyREF("contacts", contactUID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        return true
      },

      removeContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "friends") return false 

        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${contactUID}'`)
        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", contactUID)} WHERE "UID" = '${UID}'`)
        return true
      },

      blockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type == "blocked") return false 

        var preparedQuery = moduleDependencies.utils.prepareQuery({
          UID: contactUID,
          type: "blocked"
        })
        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${contactUID}'`)
        await moduleDependencies.server.query(`INSERT INTO ${CModule.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        queryResult = await CModule.dependencies.contacts.functions.fetchContact(contactUID, UID)
        if (queryResult && (queryResult.type != "blocked")) await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", contactUID)} WHERE "UID" = '${UID}'`)
        return true
      },

      unblockContact: async function(UID, contactUID) {
        if ((UID == contactUID) || !await CModule.functions.isUserExisting(UID) || !await CModule.functions.isUserExisting(contactUID)) return false
        var queryResult = await CModule.dependencies.contacts.functions.fetchContact(UID, contactUID)
        if (queryResult.type != "blocked") return false 

        await moduleDependencies.server.query(`DELETE FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${contactUID}'`)
        return true
      }
    }
  },

  groups: {
    functions: {
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
      }
    }
  }
}


/*---------------------
-- Module's Injector --
---------------------*/

exports.injectModule = function(databaseModule, databaseInstances) {
  moduleDependencies.server = databaseModule.databaseServer
  moduleDependencies.utils = databaseModule.databaseUtils
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule
  moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${CModule.REF}("UID" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "username" TEXT UNIQUE NOT NULL, "DOB" JSON NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
}