/*----------------------------------------------------------------
     Resource: vCommunity-Server
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
  prefix: "srvrgrp",
  serverThreshold: 10
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {
  constructor: async function(payload) {
    if (!payload.name || !payload.owner || (typeof(payload.name) != "string") || (payload.name.length <= 0)) return false

    try {
      await CModule.isModuleLoaded
      const fetchedGroups = await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroups(payload.owner)
      if (!fetchedGroups || (fetchedGroups.length >= CModule.serverThreshold)) return false

      var generatedToken = false
      do {
        const cToken = moduleDependencies.driver.createToken()
        const queryResult = await CModule.REF.findAll({
          where: {
            REF: cToken
          }
        })
        if (!moduleDependencies.driver.fetchSoloResult(queryResult)) generatedToken = cToken
      } while (!generatedToken)

      payload.REF = generatedToken
      var queryResult = (await CModule.REF.create(payload)).get({raw: true})
      await moduleDependencies.instances.user.dependencies.serverGroups.functions.joinGroup(queryResult.owner, queryResult.UID)
      const dependencies = Object.entries(CModule.dependencies)
      for (const dependency in dependencies) {
        if (dependencies[dependency][1].functions && !dependencies[dependency][1].disableAutoSync && dependencies[dependency][1].functions.constructor) {
          await dependencies[dependency][1].functions.constructor(CModule.functions.getInstanceSchema(queryResult.UID), false)
        }
      }
      return queryResult.UID
    } catch(error) {
      return false
    }
  },

  destructor: async function(UID) {
    if (!await CModule.functions.isGroupExisting(UID)) return false

    try {
      await CModule.isModuleLoaded
      await CModule.REF.destroy({
        where: {
          UID: UID
        }
      })
      await moduleDependencies.driver.destroySchema(CModule.functions.getInstanceSchema(UID))
      return true
    } catch(error) {
      return false
    }
  },

  getInstanceSchema: function(UID) {
    return "\"" + CModule.prefix + "_" + UID + "\""
  },

  getRoomREF: function(UID) {
    if (!UID) return false

    return CModule.prefix + "_" + UID
  },

  isGroupExisting: async function(UID, fetchData) {
    if (!UID) return false

    try {
      const queryResult = await CModule.REF.findAll({
        where: {
          UID: UID
        }
      })
      if (fetchData) return moduleDependencies.driver.fetchSoloResult(queryResult)
      else return (moduleDependencies.driver.fetchSoloResult(queryResult) && true) || false
    } catch(error) {
      return false
    }
  },

  isGroupREFValid: async function(REF, fetchData) {
    if (!REF) return false

    try {
      const queryResult = await CModule.REF.findAll({
        where: {
          REF: REF
        }
      })
      if (fetchData) return moduleDependencies.driver.fetchSoloResult(queryResult)
      else return (moduleDependencies.driver.fetchSoloResult(queryResult) && true) || false
    } catch(error) {
      return false
    }
  }
}


/*-------------------------
-- Module's Dependencies --
-------------------------*/

CModule.dependencies = {
  channels: {
    functions: {
      constructor: function(schema, skipSync) {
        return moduleDependencies.driver.createREF("channels", skipSync, {
          "UID": {
            type: moduleDependencies.driver.BIGINT,
            autoIncrement: true,
            primaryKey: true
          },
          "name": {
            type: moduleDependencies.driver.TEXT,
            allowNull: false
          },
          "description": {
            type: moduleDependencies.driver.TEXT,
            allowNull: true
          },
          "category": {
            type: moduleDependencies.driver.TEXT,
            allowNull: true
          }
        }, {
          schema: schema
        })
      },

      createChannel: async function(UID, payload, userUID) {
        if (!payload || !payload.name || (typeof(payload.name) != "string") || (payload.name.length <= 0)) return false
        if (userUID) {
          if (!await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(userUID, UID)) return false
        } else {
          if (!await CModule.functions.isGroupExisting(UID)) return false
        }

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.channels.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
          const queryResult = (await REF.create(payload)).get({raw: true})
          if (!queryResult) return false
          await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), queryResult.UID, false)
          return queryResult.UID
        } catch(error) {
          return false
        }
      },

      fetchChannel: async function(UID, channelUID) {
        if (!UID || !channelUID || !await CModule.functions.isGroupExisting(UID)) return false

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.channels.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
          const queryResult = await REF.findAll({
            where: {
              UID: channelUID
            }
          })
          return moduleDependencies.driver.fetchSoloResult(queryResult)
        } catch(error) {
          return false
        }
      },

      fetchChannels: async function(UID) {
        if (!UID || !await CModule.functions.isGroupExisting(UID)) return false

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.channels.functions.constructor(CModule.functions.getInstanceSchema(UID), true)
          const queryResult = await REF.findAll()
          return queryResult
        } catch(error) {
          return false
        }
      }
    }
  },

  messages: {
    disableAutoSync: true,
    syncRate: 500,
    functions: {
      constructor: function(schema, channelUID, skipSync) {
        return moduleDependencies.driver.createREF("messages_#" + channelUID, skipSync, {
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

      createMessage: async function(UID, channelUID, payload) {
        if (!UID || !channelUID || !payload || !payload.message || !payload.owner || (typeof(payload.message) != "string") || (payload.message.length <= 0)) return false
        if (!await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(payload.owner, UID)) return false

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), channelUID, true)
          const queryResult = (await REF.create(payload)).get({raw: true})
          return queryResult
        } catch(error) {
          return false
        }
      },

      fetchMessage: async function(UID, channelUID, messageUID, userUID) {
        if (!UID || !channelUID || !messageUID) return 
        if (userUID) {
          if (!await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(userUID, UID)) return false
        } else {
          if (!await CModule.functions.isGroupExisting(UID)) return false
        }

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), channelUID, true)
          const queryResult = await REF.findAll({
            where: {
              UID: messageUID
            }
          })
          return moduleDependencies.driver.fetchSoloResult(queryResult)
        } catch(error) {
          return false
        }
      },

      fetchMessages: async function(UID, channelUID, refMessageUID, userUID) {
        if (!UID || !channelUID) return false
        if (userUID) {
          if (!await moduleDependencies.instances.user.dependencies.serverGroups.functions.fetchGroup(userUID, UID)) return false
        } else {
          if (!await CModule.functions.isGroupExisting(UID)) return false
        }

        try {
          await CModule.isModuleLoaded
          const REF = await CModule.dependencies.messages.functions.constructor(CModule.functions.getInstanceSchema(UID), channelUID, true)
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
        } catch(error) {
          return false
        }
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