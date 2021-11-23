/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: handlers: database.js
     Server: -
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
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