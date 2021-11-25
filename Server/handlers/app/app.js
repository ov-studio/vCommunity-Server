/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app.js
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
const clientInstances = {}


/*------------
-- Handlers --
------------*/

socketServer.of("/app").on("connection", (socket) => {
  socket.on("App:onClientConnect", function(userData) {
    if (!userData) return false
    if (!clientInstances[(userData.uid)]) clientInstances[(userData.uid)] = {}
    clientInstances[(userData.uid)][this] = true
    console.log("Client Connected..")
  })
  socket.on("App:onClientDisconnect", function(userData) {
    if (!userData || !clientInstances[(userData.uid)]) return false
    clientInstances[(userData.uid)][this] = null
    if Object.entries(socketDatas).length <= 0 clientInstances[(userData.uid)][ = null
    console.log("Client Disconnected..")
  })
})