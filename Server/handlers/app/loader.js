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


/*------------
-- Handlers --
------------*/

socketServer.of("/app").on("connection", (socket) => {
  require("./instance")(socketServer, socket)
})