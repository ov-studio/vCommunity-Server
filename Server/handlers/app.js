/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: handlers: app.js
     Server: -
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: App Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const databaseServer = require("../servers/database")
const socketServer = require("../servers/socket")


/*------------
-- Handlers --
------------*/

socketServer.of("/app").on("connection", (socket) => {
  console.log("Connected to App Socket")
})