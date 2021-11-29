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
    socket.on("App:onClientSendFriendRequest", async function(UID) {
      if (!UID) return false
      const CInstance = instanceHandler.getInstancesBySocket(this)
      if (!CInstance || !databaseHandler.instances.users.hasChild(CInstance.UID) || !databaseHandler.instances.users.hasChild(UID)) return false
      const cDate = new Date()
      databaseHandler.instances.users.child(UID).child("contacts/pending").update({
        UID: cDate
      })
    })

    socket.on("App:onClientAcceptFriendRequest", async function(UID) {
      if (!UID) return false
      const CInstance = instanceHandler.getInstancesBySocket(this)
      if (!CInstance || !databaseHandler.instances.users.hasChild(CInstance.UID) || !databaseHandler.instances.users.hasChild(UID)) return false
      const pendingSnapshot = await databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").once("value")
      const pendingSnapshotValue = pendingSnapshot.val()
      if (!pendingSnapshotValue[UID]) return false
      const cDate = new Date()
      databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
        UID: null
      })
      databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").update({
        UID: cDate
      })
      databaseHandler.instances.users.child(UID).child("contacts/friends").update({
        UID: cDate
      })
    })
  }
}