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

const clientInstances = {}
const socketInstances = {}


/*------------
-- Handlers --
------------*/

module.exports = {
  getInstancesByUID(UID) {
    if (!clientInstances[UID]) return false
    return clientInstances[UID]
  },

  getInstancesBySocket(socket) {
    if (!socketInstances[socket] || !clientInstances[(socketInstances[socket])]) return false
    return clientInstances[(socketInstances[socket])], socketInstances[socket]
  },

  initializeSocket(socketServer, socket) {
    socket.on("App:onClientConnect", function(UID) {
      if (!UID) return false
      if (!clientInstances[UID]) clientInstances[UID] = {}
      clientInstances[UID][this] = true
      socketInstances[this] = UID
    })

    socket.on("disconnect", function() {
      if (!socketInstances[this] || !clientInstances[(socketInstances[this])]) return false
      clientInstances[(socketInstances[this])][this] = null
      if (Object.entries(clientInstances[(socketInstances[this])]).length <= 0) clientInstances[(socketInstances[this])] = null
      socketInstances[this] = null
    })
  }
}