/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: handlers: app.js
     Server: -
     Author: OvileAmriam
     Developer(s): Aviril
     DOC: 22/11/2021 (OvileAmriam)
     Desc: App Handler
----------------------------------------------------------------*/


/*-----------
━━ Imports ━━
-----------*/

const databaseServer = require("../servers/database")
const socketServer = require("../servers/socket")


/*------------
━━ Handlers ━━
------------*/

socketServer.of("/app").on("connection", (socket) => {
  console.log("Connected to App Socket")
})