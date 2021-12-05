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
    constructor: async function(payload) {
      if (!payload.uid || !payload.username || !payload.dob) throw "query/constructor/failed"
      const preparedQuery = prepareQuery(payload)
      const result = await databaseServer.query(`INSERT INTO ${databaseInstances.users.ref}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      if (!result) throw "query/constructor/failed"
      const dependencies = Object.entries(databaseInstances.users.dependencies)
      for (const dependency in dependencies) {
        const result = await dependencies[dependency][1].constructor(databaseInstances.users.prefix + "_" + payload.uid + "_" + dependencies[dependency][1].prefix, payload)
        if (!result) throw "query/constructor/failed"
      }
      return true
    },
    dependencies: {
      contacts: {
        prefix: "CNTCTS",
        constructor: function(ref, payload) {
          return databaseServer.query(`CREATE TABLE IF NOT EXISTS ${ref}(contacts TEXT PRIMARY KEY, state TEXT NOT NULL, doc timestamp with time zone DEFAULT now())`)
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
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.users.ref}(uid TEXT PRIMARY KEY, username TEXT NOT NULL, dob JSON NOT NULL, doc timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.personalGroups.ref}(uid BIGSERIAL PRIMARY KEY, doc timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.publicGroups.ref}(uid BIGSERIAL PRIMARY KEY, doc timestamp with time zone DEFAULT now())`)
databaseServer.query(`CREATE TABLE IF NOT EXISTS ${databaseInstances.serverGroups.ref}(uid BIGSERIAL PRIMARY KEY, doc timestamp with time zone DEFAULT now())`)

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
}