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
const databaseInstances = {
  users: {
    REF: "\"APP_USERS\"",
    prefix: "usr",
    functions: {
      constructor: async function(payload) {
        if (!payload.UID || !payload.username || !payload.DOB) return false
        const preparedQuery = prepareQuery(payload)
        const queryResult = await databaseServer.query(`INSERT INTO ${databaseInstances.users.REF}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        if (!queryResult) return false
        const dependencies = Object.entries(databaseInstances.users.dependencies)
        for (const dependency in dependencies) {
          await dependencies[dependency][1].functions.constructor(databaseInstances.users.functions.getDependencyRef(dependencies[dependency][0], payload.UID), payload)
        }
        return true
      },

      getDependencyRef: function(dependency, UID) {
        if (!dependency || !databaseInstances.users.dependencies[dependency] || !UID) return false
        return "\"" + databaseInstances.users.prefix + "_" + UID + "_" + databaseInstances.users.dependencies[dependency].prefix + "\""
      },

      isUserExisting: async function(UID) {
        if (!UID) return false
        const queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.users.REF} WHERE "UID" = '${UID}'`)
        return (queryResult && queryResult.rows.length > 0) || false
      },
    },

    dependencies: {
      contacts: {
        prefix: "cntcs",
        functions: {
          constructor: function(REF, payload) {
            return databaseServer.query(`CREATE TABLE IF NOT EXISTS ${REF}("UID" TEXT PRIMARY KEY, state TEXT NOT NULL, group TEXT UNIQUE NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
          }
        }
      }
    }
  },

  personalGroups: {
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
          await dependencies[dependency][1].functions.constructor(databaseInstances.personalGroups.functions.getDependencyRef(dependencies[dependency][0], payload.UID), payload)
        }
        return payload.UID
      },

      getDependencyRef: function(dependency, UID) {
        if (!dependency || !databaseInstances.personalGroups.dependencies[dependency] || !UID) return false
        return "\"" + databaseInstances.personalGroups.prefix + "_" + UID + "_" + databaseInstances.personalGroups.dependencies[dependency].prefix + "\""
      },

      isGroupExisting: async function(UID) {
        if (!UID) return false
        const queryResult = await databaseServer.query(`SELECT * FROM ${databaseInstances.personalGroups.REF} WHERE "UID" = '${UID}'`)
        return (queryResult && queryResult.rows.length > 0) || false
      },
    },

    dependencies: {}
  },

  privateGroups: {
    REF: "\"APP_PRIVATE_GROUPS\"",
    prefix: "prvtgrp"
  },

  publicGroups: {
    REF: "\"APP_PUBLIC_GROUPS\"",
    prefix: "pblcgrp"
  },

  serverGroups: {
    REF: "\"APP_SERVER_GROUPS\"",
    prefix: "srvrgrp"
  }
}
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.users.REF}("UID" TEXT PRIMARY KEY, username TEXT NOT NULL, "DOB" JSON NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
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