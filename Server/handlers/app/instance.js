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
  getInstancesByUID(uid) {
    if (!clientInstances[uid]) return false
    return clientInstances[uid]
  },

  getInstancesBySocket(socket) {
    if (!socketInstances[socket] || !clientInstances[(socketInstances[socket])]) return false
    return clientInstances[(socketInstances[socket])]
  },

  initializeSocket(socketServer, socket) {
    socket.on("App:onClientConnect", function(uid) {
      if (!uid) return false
      if (!clientInstances[uid]) clientInstances[uid] = {}
      clientInstances[uid][this] = true
      socketInstances[this] = uid
    })

    socket.on("disconnect", function() {
      if (!socketInstances[this] || !clientInstances[(socketInstances[this])]) return false
      clientInstances[(socketInstances[this])][this] = null
      if (Object.entries(clientInstances[(socketInstances[this])]).length <= 0) clientInstances[(socketInstances[this])] = null
      socketInstances[this] = null
    })
  }
}