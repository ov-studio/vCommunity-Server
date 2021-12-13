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
const socketDependencies = [
  require("./instance")
]
require("./contacts")
require("./groups/personal")
require("./syncer")


/*------------
-- Handlers --
------------*/

socketServer.of("/app").on("connection", (socket) => {
  socketDependencies.forEach(function(dependency) {
    dependency.injectSocket(socketServer, socket)
  })
})