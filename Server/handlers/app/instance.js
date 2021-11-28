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

const CInstances = {}
const socketIntances = {}


/*------------
-- Handlers --
------------*/

module.exports = function(socketServer, socket) {
  socket.on("App:onClientConnect", function(userData) {
    if (!userData) return false
    if (!CInstances[(userData.uid)]) CInstances[(userData.uid)] = {}
    CInstances[(userData.uid)][this] = true
    socketIntances[this] = userData.uid
  })

  socket.on("disconnect", function() {
    if (!socketIntances[this] || !CInstances[(socketIntances[this])]) return false
    CInstances[(socketIntances[this])][this] = null
    if (Object.entries(CInstances[(socketIntances[this])]).length <= 0) CInstances[(socketIntances[this])] = null
    socketIntances[this] = null
  })
}