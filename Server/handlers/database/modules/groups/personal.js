/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: modules: groups: personal.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Personal Group Module
----------------------------------------------------------------*/


/*----------
-- Module --
----------*/

const moduleName = "personalGroup", moduleDependencies = {}
const CModule = {
  REF: "APP_PERSONAL_GROUPS",
  prefix: "prsnlgrp"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.senderUID || !payload.receiverUID) return false
    var groupRefs = [payload.senderUID + "/" + payload.receiverUID, payload.receiverUID + "/" + payload.senderUID]
    var queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.REF} WHERE "REF" IN ('${groupRefs[0]}', '${groupRefs[1]}')`)
    queryResult = moduleDependencies.utils.fetchSoloResult(queryResult)
    if (queryResult) return queryResult.UID

    payload = {
      REF: groupRefs[0]
    }
    const preparedQuery = moduleDependencies.utils.prepareQuery(payload)
    queryResult = await moduleDependencies.server.query(`INSERT INTO ${CModule.REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs}) RETURNING *`, preparedQuery.values)
    queryResult = moduleDependencies.utils.fetchSoloResult(queryResult)
    if (!queryResult) return false
    const dependencies = Object.entries(CModule.dependencies)
    for (const dependency in dependencies) {
      if (dependencies[dependency][1].functions && dependencies[dependency][1].functions.constructor) await dependencies[dependency][1].functions.constructor(CModule.functions.getDependencyREF(dependencies[dependency][0], queryResult.UID))
    }
    return queryResult.UID
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isGroupExisting(UID)) return false

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

  isGroupExisting: async function(UID) {
    if (!UID) return false

    const queryResult = await moduleDependencies.server.query(`SELECT * FROM ${CModule.REF} WHERE "UID" = '${UID}'`)
    return (queryResult && queryResult.rows.length > 0) || false
  }
}


/*-------------------------
-- Module's Dependencies --
-------------------------*/

CModule.dependencies = {
  messages: {
    suffix: "msgs",
    syncRate: 500,
    functions: {
      constructor: function(REF) {
        return moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${REF}("UID" BIGSERIAL PRIMARY KEY, "message" TEXT NOT NULL, "owner" TEXT NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
      },

      createMessage: async function(REF, payload) {
        const preparedQuery = moduleDependencies.utils.prepareQuery(payload)
        const queryResult = await moduleDependencies.server.query(`INSERT INTO ${REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs}) RETURNING *`, preparedQuery.values)
        return moduleDependencies.utils.fetchSoloResult(queryResult)
      },

      fetchMessage: async function(REF, UID) {
        if (!UID) return false

        const queryResult = await moduleDependencies.server.query(`SELECT * FROM ${REF} WHERE "UID" = '${UID}'`)
        return moduleDependencies.utils.fetchSoloResult(queryResult)
      },

      fetchMessages: async function(REF, UID) {
        if (!UID) {
          let queryResult = await moduleDependencies.server.query(`SELECT * FROM ${REF} ORDER BY "UID" DESC LIMIT 1`)
          queryResult = moduleDependencies.utils.fetchSoloResult(queryResult)
          if (queryResult) UID = queryResult.UID + 1
        }
        if (!UID) return false

        const queryResult = await moduleDependencies.server.query(`SELECT * FROM ${REF} WHERE "UID" < '${UID}' ORDER BY "UID" DESC LIMIT '${CModule.dependencies.messages.syncRate}'`)
        queryResult.rows.reverse()
        return queryResult.rows
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
  moduleDependencies.defaultSchema = databaseModule.defaultSchema
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule

  CModule.isModuleLoaded = new Promise(async function(resolve) {
    await moduleDependencies.server.isAuthorized
    CModule.REF = await moduleDependencies.driver.createREF(CModule.REF, false, {
      "UID": {
        type: moduleDependencies.driver.BIGINT,
        primaryKey: true
        // TODO: MAKE AUTO INCREMENT..
      },
      "REF": {
        type: moduleDependencies.driver.TEXT,
        unique: true,
        allowNull: false
      },
    }, {
      schema: moduleDependencies.defaultSchema
    })
    resolve()
  })
}