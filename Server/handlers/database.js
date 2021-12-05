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

const {databaseServer} = require("../servers/database")
const databaseInstances = {
  users: {
    ref: "APP_USERS",
    prefix: "USR",
    functions: {
      constructor: async function(payload) {
        if (!payload.UID || !payload.username || !payload.DOB) return false
        const preparedQuery = prepareQuery(payload)
        console.log(payload)
        const result = await databaseServer.query(`INSERT INTO ${databaseInstances.users.ref}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        if (!result) return false
        const dependencies = Object.entries(databaseInstances.users.dependencies)
        for (const dependency in dependencies) {
          await dependencies[dependency][1].functions.constructor(databaseInstances.users.functions.getDependencyRef(dependencies[dependency][0], payload.UID), payload)
        }
        return true
      },

      getDependencyRef: function(dependency, UID) {
        if (!dependency || !databaseInstances.users.dependencies[dependency] || !UID) return false
        return databaseInstances.users.prefix + "_" + UID + "_" + databaseInstances.users.dependencies[dependency].prefix
      },

      isUserExisting: function(UID) {
        if (!UID) return false
        const result = databaseServer.query(`SELECT * FROM ${databaseInstances.users.ref} WHERE UID = ${UID}`)
        return (result && result.rows > 0) || false
      },
    },
    dependencies: {
      contacts: {
        prefix: "CNTCTS",
        functions: {
          constructor: function(ref, payload) {
            return databaseServer.query(`CREATE TABLE IF NOT EXISTS ${ref}(contacts TEXT PRIMARY KEY, state TEXT NOT NULL, DOC timestamp with time zone DEFAULT now())`)
          }
        }
      }
    }
  },

  personalGroups: {
    ref: "APP_PERSONAL_GROUPS",
    prefix: "PRSNLGRP"
  },

  privateGroups: {
    ref: "APP_PRIVATE_GROUPS",
    prefix: "PRVTEGRP"
  },

  publicGroups: {
    ref: "APP_PUBLIC_GROUPS",
    prefix: "PBLCGRP"
  },

  serverGroups: {
    ref: "APP_SERVER_GROUPS",
    prefix: "SRVRGRP"
  }
}
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.users.ref}(UID TEXT PRIMARY KEY, username TEXT NOT NULL, DOB JSON NOT NULL, DOC timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.personalGroups.ref}(UID BIGSERIAL PRIMARY KEY, DOC timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.publicGroups.ref}(UID BIGSERIAL PRIMARY KEY, DOC timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.serverGroups.ref}(UID BIGSERIAL PRIMARY KEY, DOC timestamp with time zone DEFAULT now())`)

function prepareQuery(queryDatas) {
  if (!queryDatas) return false
  let valueIDs = "", valueID = 0
  const columns = [], values = []
  Object.entries(queryDatas).forEach(function(queryData) {
    valueIDs += (valueID == 0) ? `$1` : `, $${valueID + 1}`
    valueID = valueID + 1
    columns.push(queryData[0])
    values.push(queryData[1])
  })
  return {columns, valueIDs, values}
}

module.exports = {
  server: databaseServer,
  instances: databaseInstances,
  prepareQuery: prepareQuery,

  //TODO: REMOVE THIS...LATER
  /*
  async hasSnapshot(snapshotURL) {
    if (!snapshotURL) return false
    const snapshot = await snapshotURL.once("value")
    return (snapshot && snapshot.exists() && true) || false
  },

  async getSnapshot(snapshotURL, fetchValue) {
    if (!snapshotURL) return false
    const snapshot = await snapshotURL.once("value")
    if (!snapshot || !snapshot.exists()) return false
    if (!fetchValue) return snapshot
    else return snapshot.val()
  }
  */
}