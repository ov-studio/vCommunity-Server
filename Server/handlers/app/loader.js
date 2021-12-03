/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: loader.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: App Loader
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const socketServer = require("../../servers/socket")
const syncerHandler = require("./syncer")
const socketDependencies = [
  require("./instance"),
  require("./contacts"),
  require("./groups/personal")
]


/*------------
-- Handlers --
------------*/

socketServer.of("/app").on("connection", (socket) => {
  socketDependencies.forEach(async function(depenency) {
    depenency.injectSocket(socketServer, socket)
  })
})