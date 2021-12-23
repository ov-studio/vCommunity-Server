/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: instance.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Instance Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const eventServer = require("../../servers/event")
const clientInstances = {}
const socketInstances = {}


/*------------
-- Handlers --
------------*/

exports.getInstancesByUID = function(UID) {
  if (!UID || !clientInstances[UID]) return false

  return clientInstances[UID]
}

exports.getInstancesBySocket = function(socket, fetchOnlyUID) {
  const UID = socketInstances[(socket.id)]
  if (!UID) return false

  const cInstances = getInstancesByUID(UID)
  if (!cInstances) return false
  if (fetchOnlyUID) return UID
  return {UID: UID, instances: cInstances}
}

exports.injectSocket: async function(socketServer, socket) {
  socket.on("App:onClientConnect", async function(UID) {
    if (!UID) return false
    if (!clientInstances[UID]) clientInstances[UID] = {}

    const socketID = this.id
    clientInstances[UID][socketID] = this
    socketInstances[socketID] = UID
    eventServer.emit("App:onClientConnect", this, UID)
  })

  socket.on("disconnect", function() {
    const socketID = this.id
    const UID = socketInstances[socketID]
    if (!UID || !clientInstances[UID]) return false

    delete clientInstances[UID][socketID]
    delete socketInstances[socketID]
    if (Object.keys(clientInstances[UID]).length <= 0) delete clientInstances[UID]
    eventServer.emit("App:onClientDisconnect", UID)
  })
}