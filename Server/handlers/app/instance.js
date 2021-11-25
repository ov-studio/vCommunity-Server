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


/*------------
-- Handlers --
------------*/

module.exports = function(socketServer, socket) {
  socket.on("App:onClientConnect", function(userData) {
    if (!userData) return false
    if (!CInstances[(userData.uid)]) CInstances[(userData.uid)] = {}
    CInstances[(userData.uid)][this] = true
  })

  socket.on("App:onClientDisconnect", function(userData) {
    if (!userData || !CInstances[(userData.uid)]) return false
    CInstances[(userData.uid)][this] = null
    if (Object.entries(socketDatas).length <= 0) CInstances[(userData.uid)] = null
  })
}