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
      await dependencies[dependency][1].functions.constructor(CModule.functions.getDependencyREF(dependencies[dependency][0], payload.UID))
    }
    return {success: true, status: "auth/successful"}
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isUserExisting(UID)) return false

    await moduleDependencies.server.query(`DELETE FROM ${CModule.REF} WHERE "UID" = '${UID}'`)
    for (const dependency in dependencies) {
      await moduleDependencies.server.query(`DROP TABLE IF EXISTS ${CModule.functions.getDependencyREF(dependencies[dependency][0], UID)}`)
    }
    return true
  },

  getDependencyREF: function(dependency, UID) {
    if (!dependency || !CModule.dependencies[dependency] || !UID) return false

    return "\"" + CModule.prefix + "_" + UID + "_" + CModule.dependencies[dependency].suffix + "\""
  },

  isUserExisting: async function(UID, fetchData, fetchPassword) {
    if (!UID) return false

    var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.REF} WHERE "UID" = '${UID}'`)
    if (fetchData) {
      queryResult = moduleDependencies.utils.fetchSoloResult(queryResult)
      if (queryResult && !fetchPassword) delete queryResult.password
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

      fetchContacts: async function(UID, type) {
        if (!UID || !await CModule.functions.isUserExisting(UID)) return false
        if (type && (CModule.dependencies.contacts.types.indexOf(type) == -1)) return false

        if (type) {
          var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.functions.getDependencyREF("contacts", UID)} WHERE type = '${type}'`)
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