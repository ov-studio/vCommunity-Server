/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: contacts.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Contacts Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const databaseHandler = require("../database")
const instanceHandler = require("./instance")


/*------------
-- Handlers --
------------*/

module.exports = {
  initializeSocket(socketServer, socket) {
    socket.on("App:onClientAcceptFriendRequest", function(uid) {
      const clientInstance = instanceHandler.getInstancesBySocket(this)
      if (!clientInstance) return false
      databaseHandler.instances.users.child(user.uid).child("contacts").child("friends")
    })
  }
}