/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: groups: server.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Server Group Module
----------------------------------------------------------------*/


/*----------
-- Module --
----------*/

const moduleName = "serverGroup", moduleDependencies = {}
const CModule = {
  REF: "server_groups",
  prefix: "srvrgrp"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.name || !payload.owner || (typeof(payload.name) != "string") || (payload.name.length <= 0)) return false
    if (!await moduleDependencies.instances.user.functions.isUserExisting(payload.owner)) return false

    await CModule.isModuleLoaded
    try {
      var queryResult = (await CModule.REF.create(payload)).get({raw: true})  
    } catch(error) {
      return false
    }
    const dependencies = Object.entries(CModule.dependencies)
    for (const dependency in dependencies) {
      if (dependencies[dependency][1].functions && !dependencies[dependency][1].disableAutoSync && dependencies[dependency][1].functions.constructor) {
        await dependencies[dependency][1].functions.constructor(CModule.functions.getInstanceSchema(queryResult.UID), false)
      }
    }
    return queryResult.UID
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isGroupExisting(UID)) return false

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

  isGroupExisting: async function(UID) {
    if (!UID) return false

    const queryResult = await CModule.REF.findAll({
      where: {
        UID: UID
      }
    })
    return (moduleDependencies.driver.fetchSoloResult(queryResult) && true) || false
  }
}


/*-------------------------
-- Module's Dependencies --
-------------------------*/

CModule.dependencies = {
  messages: {
    disableAutoSync: false,
    syncRate: 500,
    functions: {
      /*
      constructor: function(schema, skipSync) {
        return moduleDependencies.driver.createREF("messages", skipSync, {
          "UID": {
            type: moduleDependencies.driver.BIGINT,
            autoIncrement: true,
            primaryKey: true
          },
          "message": {
            type: moduleDependencies.driver.TEXT,
            allowNull: false
          },
          "owner": {
            type: moduleDependencies.driver.TEXT,
            allowNull: false
          }
        }, {
          schema: schema
        })
      },
    */
      createMessage: async function(UID, payload) {
        if (!UID || !payload || !payload.message || !payload.owner || (typeof(payload.message) != "string") || (payload.message.length <= 0)) return false
        //if (!await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(payload.owner, UID)) return false
  
        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        const queryResult = await REF.create(payload)
        return queryResult
      },

      fetchMessage: async function(UID, messageUID, userUID) {
        if (!UID || !messageUID) return false
        //if (userUID && !await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(userUID, UID)) return false

        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        const queryResult = await REF.findAll({
          where: {
            UID: messageUID
          }
        })
        return moduleDependencies.driver.fetchSoloResult(queryResult)
      },

      fetchMessages: async function(UID, refMessageUID, userUID) {
        if (!UID) return false
        //if (userUID && !await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(userUID, UID)) return false

        await CModule.isModuleLoaded
        const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
        if (!refMessageUID) {
          var queryResult = await REF.findAll({
            order: [
              ["UID", "DESC"]
            ],
            limit: 1
          })
          queryResult = moduleDependencies.driver.fetchSoloResult(queryResult)
          if (queryResult) refMessageUID = queryResult.UID + 1
        }
        if (!refMessageUID) return false

        queryResult = await REF.findAll({
          where: {
            UID: {
              [moduleDependencies.driver.Op.lt]: refMessageUID
            }
          },
          order: [
            ["UID", "DESC"]
          ],
          limit: CModule.dependencies.messages.syncRate
        })
        queryResult.reverse()
        return queryResult
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
        autoIncrement: true,
        primaryKey: true
      },
      "REF": {
        type: moduleDependencies.driver.TEXT,
        unique: true,
        allowNull: false
      },
      "name": {
        type: moduleDependencies.driver.TEXT,
        allowNull: false
      },
      "owner": {
        type: moduleDependencies.driver.TEXT,
        allowNull: false
      }
    }, {
      schema: moduleDependencies.defaultSchema
    })
    resolve()
  })
}