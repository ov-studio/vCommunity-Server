/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Database Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const {databaseServer, isTableExisting, prepareQuery, fetchSoloResult} = require("../servers/database")
const databaseInstances = {}


/*-----------
-- Modules --
-----------*/

databaseInstances.users = {
  REF: "\"APP_USERS\"",
  prefix: "usr",
  functions: {
    constructor: async function(payload) {
      if (!payload.UID || !payload.username || !payload.DOB) return false
      const preparedQuery = prepareQuery(payload)
      if (await databaseInstances.users.functions.isUsernameExisting(payload.username)) return {status: "auth/username-already-exists"}

      const queryResult = await databaseServer.query(`INSERT INTO ${databaseInstances.users.REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      if (!queryResult) return {status: "auth/failed"}
      const dependencies = Object.entries(databaseInstances.users.dependencies)
      for (const dependency in dependencies) {
        await dependencies[dependency][1].functions.constructor(databaseInstances.users.functions.getDependencyREF(dependencies[dependency][0], payload.UID))
      }
      return {success: true, status: "auth/successful"}
    },

    getDependencyREF: function(dependency, UID) {
      if (!dependency || !databaseInstances.users.dependencies[dependency] || !UID) return false
      return "\"" + databaseInstances.users.prefix + "_" + UID + "_" + databaseInstances.users.dependencies[dependency].suffix + "\""
    },

    isUserExisting: async function(UID, fetchData, fetchPassword) {
      if (!UID) return false
      var queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.users.REF} WHERE "UID" = '${UID}'`)
      if (fetchData) {
        queryResult = fetchSoloResult(queryResult)
        if (queryResult && (!fetchPassword)) delete queryResult.password
        return queryResult
      }
      else return (queryResult && (queryResult.rows.length > 0)) || false
    },

    isUsernameExisting: async function(username, fetchData) {
      if (!username) return false
      const queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.users.REF} WHERE "username" = '${username}'`)
      if (fetchData) return fetchSoloResult(queryResult)
      else return (queryResult && (queryResult.rows.length > 0)) || false
    }
  },

  dependencies: {
    contacts: {
      suffix: "cntcs",
      functions: {
        constructor: function(REF) {
          return databaseServer.query(`CREATE TABLE IF NOT EXISTS ${REF}("UID" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "group" BIGINT UNIQUE, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
        }
      }
    }
  }
}

databaseInstances.personalGroups = {
  REF: "\"APP_PERSONAL_GROUPS\"",
  prefix: "prsnlgrp",
  functions: {
    constructor: async function(payload) {
      if (!payload.senderUID || !payload.receiverUID) return false
      var groupRefs = [payload.senderUID + "/" + payload.receiverUID, payload.receiverUID + "/" + payload.senderUID]
      var queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.personalGroups.REF} WHERE "REF" IN ('${groupRefs[0]}', '${groupRefs[1]}')`)
      queryResult = fetchSoloResult(queryResult)
      if (queryResult) return queryResult.UID

      payload = {
        REF: groupRefs[0]
      }
      const preparedQuery = prepareQuery(payload)
      queryResult = await databaseServer.query(`INSERT INTO ${databaseInstances.personalGroups.REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs}) RETURNING *`, preparedQuery.values)
      queryResult = fetchSoloResult(queryResult)
      if (!queryResult) return queryResult.UID
      payload.UID = queryResult.UID
      const dependencies = Object.entries(databaseInstances.personalGroups.dependencies)
      for (const dependency in dependencies) {
        await dependencies[dependency][1].functions.constructor(databaseInstances.personalGroups.functions.getDependencyREF(dependencies[dependency][0], payload.UID))
      }
      return payload.UID
    },

    getDependencyREF: function(dependency, UID) {
      if (!dependency || !databaseInstances.personalGroups.dependencies[dependency] || !UID) return false
      return "\"" + databaseInstances.personalGroups.prefix + "_" + UID + "_" + databaseInstances.personalGroups.dependencies[dependency].suffix + "\""
    },

    getRoomREF: function(UID) {
      if (!UID) return false
      return databaseInstances.personalGroups.prefix + "_" + UID
    },

    isGroupExisting: async function(UID) {
      if (!UID) return false
      const queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.personalGroups.REF} WHERE "UID" = '${UID}'`)
      return (queryResult && queryResult.rows.length > 0) || false
    }
  },

  dependencies: {
    messages: {
      suffix: "msgs",
      syncRate: 250,
      functions: {
        constructor: function(REF) {
          return databaseServer.query(`CREATE TABLE IF NOT EXISTS ${REF}("UID" BIGSERIAL PRIMARY KEY, "message" TEXT NOT NULL, "owner" TEXT NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
        },

        createMessage: async function(REF, payload) {
          const preparedQuery = prepareQuery(payload)
          const queryResult = await databaseServer.query(`INSERT INTO ${REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs}) RETURNING *`, preparedQuery.values)
          return fetchSoloResult(queryResult)
        },

        fetchMessage: async function(REF, UID) {
          if (!UID) return false
          const queryResult = await databaseServer.query(`SELECT * FROM ${REF} WHERE "UID" = '${UID}'`)
          return fetchSoloResult(queryResult)
        },

        fetchMessages: async function(REF, UID) {
          if (!UID) {
            let queryResult = await databaseServer.query(`SELECT * FROM ${REF} ORDER BY "UID" DESC LIMIT 1`)
            queryResult = fetchSoloResult(queryResult)
            if (queryResult) UID = queryResult.UID + 1
          }
          if (!UID) return false

          const queryResult = await databaseServer.query(`SELECT * FROM ${REF} WHERE "UID" < '${UID}' ORDER BY "UID" DESC LIMIT '${databaseInstances.personalGroups.dependencies.messages.syncRate}'`)
          queryResult.rows.reverse()
          return queryResult.rows
        }
      }
    }
  }
}

databaseInstances.privateGroups = {
  REF: "\"APP_PRIVATE_GROUPS\"",
  prefix: "prvtgrp"
}

databaseInstances.publicGroups = {
  REF: "\"APP_PUBLIC_GROUPS\"",
  prefix: "pblcgrp"
}

databaseInstances.serverGroups = {
  REF: "\"APP_SERVER_GROUPS\"",
  prefix: "srvrgrp"
}

databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.users.REF}("UID" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "username" TEXT UNIQUE NOT NULL, "DOB" JSON NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.personalGroups.REF}("UID" BIGSERIAL PRIMARY KEY, "REF" TEXT UNIQUE NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.publicGroups.REF}("UID" BIGSERIAL PRIMARY KEY, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.serverGroups.REF}("UID" BIGSERIAL PRIMARY KEY, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)

module.exports = {
  server: databaseServer,
  instances: databaseInstances,
  isTableExisting,
  prepareQuery,
  fetchSoloResult
}