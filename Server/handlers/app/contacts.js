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
    socket.on("App:onClientFriendRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstance = instanceHandler.getInstancesBySocket(this)
      if (!CInstance || (CInstance.UID == UID) || !databaseHandler.instances.users.hasChild(CInstance.UID) || !databaseHandler.instances.users.hasChild(UID)) return false
      if (requestType == "send") {
        const friendsSnapshot = await databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").once("value")
        const friendsSnapshotValue = friendsSnapshot.val()
        const pendingSnapshot = await databaseHandler.instances.users.child(UID).child("contacts/pending").once("value")
        const pendingSnapshotValue = pendingSnapshot.val()
        const blockedSnapshot = await databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").once("value")
        const blockedSnapshotValue = blockedSnapshot.val()
        if (friendsSnapshotValue[UID] || pendingSnapshotValue[UID] || blockedSnapshotValue[UID]) return false
        const cDate = new Date()
        databaseHandler.instances.users.child(UID).child("contacts/pending").update({
          [CInstance.UID]: cDate
        })
        return true
      }
      else {
        const pendingSnapshot = await databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").once("value")
        const pendingSnapshotValue = pendingSnapshot.val()
        if (!pendingSnapshotValue[UID]) return false
        if (requestType == "accept") {
          const cDate = new Date()
          databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
            [UID]: null
          })
          databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").update({
            [UID]: cDate
          })
          databaseHandler.instances.users.child(UID).child("contacts/friends").update({
            [CInstance.UID]: cDate
          })
          return true
        }
        else if (requestType == "reject") {
          databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
            [UID]: null
          })
          return true
        }
      }
      return false
    })

    socket.on("App:onClientBlockRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstance = instanceHandler.getInstancesBySocket(this)
      if (!CInstance || (CInstance.UID == UID) || !databaseHandler.instances.users.hasChild(CInstance.UID) || !databaseHandler.instances.users.hasChild(UID)) return false
      const blockedSnapshot = await databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").once("value")
      const blockedSnapshotValue = blockedSnapshot.val()
      if (requestType == "block") {
        if (blockedSnapshotValue[UID]) return false
        const cDate = new Date()
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/pending").update({
          [CInstance.UID]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/friends").update({
          [CInstance.UID]: null
        })
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").update({
          [UID]: cDate
        })
        databaseHandler.instances.users.child(UID).child("contacts/blocked").update({
          [CInstance.UID]: cDate
        })
        return true
      }
      else if (requestType == "unblock") {
        if (!blockedSnapshotValue[UID]) return false
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/blocked").update({
          [CInstance.UID]: null
        })
        return true
      }
      return false
    })
  }
}