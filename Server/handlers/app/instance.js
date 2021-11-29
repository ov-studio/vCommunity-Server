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

const contactsHandler = require("./contacts")
const clientInstances = {}
const socketInstances = {}


/*------------
-- Handlers --
------------*/

function getInstancesByUID(UID) {
  if (!UID || !clientInstances[UID]) return false
  return clientInstances[UID]
}

function getInstancesBySocket(socket) {
  const UID = socketInstances[socket]
  if (!UID) return false
  const cInstances = getInstancesByUID(UID)
  if (!cInstances) return false
  return {UID: UID, instances: cInstances}
}

module.exports = {
  getInstancesByUID: getInstancesByUID,
  getInstancesBySocket: getInstancesBySocket,

  async injectSocket(socketServer, socket) {
    socket.on("App:onClientConnect", async function(UID) {
      if (!UID) return false
      if (!clientInstances[UID]) clientInstances[UID] = {}
      clientInstances[UID][this] = true
      socketInstances[this] = UID
      this.emit("App:onSyncContacts", await contactsHandler.getContactsByUID(UID))
    })

    socket.on("disconnect", function() {
      if (!socketInstances[this] || !clientInstances[(socketInstances[this])]) return false
      clientInstances[(socketInstances[this])][this] = null
      if (Object.entries(clientInstances[(socketInstances[this])]).length <= 0) clientInstances[(socketInstances[this])] = null
      socketInstances[this] = null
    })
  }
}