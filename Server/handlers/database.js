/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: handlers: database.js
     Server: -
     Author: OvileAmriam
     Developer(s): Aviril
     DOC: 22/11/2021 (OvileAmriam)
     Desc: Database Handler
----------------------------------------------------------------*/


/*-----------
━━ Imports ━━
-----------*/

const databaseServer = require("../servers/database")
const databaseInstance = databaseServer.database()

module.exports = {
  users: databaseInstance.ref("users"),
  privGroups: databaseInstance.ref("private-groups"),
  serverGroups: databaseInstance.ref("server-groups")
}