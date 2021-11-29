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

async function getContactsByUID(UID) {  
  if (!databaseHandler.instances.users.hasChild(UID)) return false
  const friendSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(UID).child("contacts/friends"))
  const friendSnapshotValue = friendSnapshot.val()
  const pendingSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(UID).child("contacts/pending"))
  const pendingSnapshotValue = pendingSnapshot.val()
  const blockedSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(UID).child("contacts/pending"))
  const blockedSnapshotValue = blockedSnapshot.val()
  return {
    "friends": friendSnapshotValue,
    "pending": pendingSnapshotValue,
    "blocked": blockedSnapshotValue
  }
}

async function getContactsBySocket(socket) {
  const CInstance = instanceHandler.getInstancesBySocket(socket)
  if (!CInstance) return false
  return await getContactsByUID(CInstance.UID)
}

module.exports = {
  getContactsByUID: getContactsByUID,
  getContactsBySocket: getContactsBySocket,

  injectSocket(socketServer, socket) {
    socket.on("App:onClientFriendRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstance = instanceHandler.getInstancesBySocket(this)
      if (!CInstance || (CInstance.UID == UID) || !databaseHandler.instances.users.hasChild(CInstance.UID) || !databaseHandler.instances.users.hasChild(UID)) return false
      if (requestType == "send") {
        const client_friendsSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends"))
        const client_friendsSnapshotValue = client_friendsSnapshot.val()
        const client_blockedSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked"))
        const client_blockedSnapshotValue = client_blockedSnapshot.val()
        const target_pendingSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(UID).child("contacts/pending"))
        const target_pendingSnapshotValue = target_pendingSnapshot.val()
        const target_blockedSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(UID).child("contacts/blocked"))
        const target_blockedSnapshotValue = target_blockedSnapshot.val()
        if (client_friendsSnapshotValue[UID] || client_blockedSnapshotValue[UID] || target_pendingSnapshotValue[(CInstance.UID)] || target_blockedSnapshotValue[(CInstance.UID)]) return false
        const cDate = new Date()
        databaseHandler.instances.users.child(UID).child("contacts/pending").update({
          [(CInstance.UID)]: cDate
        })
        return true
      }
      else {
        const client_pendingSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending"))
        const client_pendingSnapshotValue = client_pendingSnapshot.val()
        if (!client_pendingSnapshotValue[UID]) return false
        if (requestType == "accept") {
          const cDate = new Date()
          databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
            [UID]: null
          })
          databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").update({
            [UID]: cDate
          })
          databaseHandler.instances.users.child(UID).child("contacts/friends").update({
            [(CInstance.UID)]: cDate
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
      const client_blockedSnapshot = await databaseHandler.getSnapshot(databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked"))
      const client_blockedSnapshotValue = client_blockedSnapshot.val()
      if (requestType == "block") {
        if (client_blockedSnapshotValue[UID]) return false
        const cDate = new Date()
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/pending").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/friends").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/pending").update({
          [(CInstance.UID)]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/friends").update({
          [(CInstance.UID)]: null
        })
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").update({
          [UID]: cDate
        })
        databaseHandler.instances.users.child(UID).child("contacts/blocked").update({
          [(CInstance.UID)]: cDate
        })
        return true
      }
      else if (requestType == "unblock") {
        if (!client_blockedSnapshotValue[UID]) return false
        databaseHandler.instances.users.child(CInstance.UID).child("contacts/blocked").update({
          [UID]: null
        })
        databaseHandler.instances.users.child(UID).child("contacts/blocked").update({
          [(CInstance.UID)]: null
        })
        return true
      }
      return false
    })
  }
}