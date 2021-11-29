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

const databaseServer = require("../servers/database")
const databaseInstance = databaseServer.database()
const databaseInstances = {
  users: databaseInstance.ref("users"),
  privateGroups: databaseInstance.ref("private-groups"),
  publicGroups: databaseInstance.ref("private-groups"),
  serverGroups: databaseInstance.ref("server-groups")
}

module.exports = {
  instances: databaseInstances,

  async getSnapshot(snapshotURL) {
    if (!snapshotURL) return false
    const snapshot = await snapshotURL.once("value")
    return (snapshot && snapshot.exists() && snapshot) || false
  }
}