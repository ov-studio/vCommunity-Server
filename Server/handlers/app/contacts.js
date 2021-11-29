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
  const userRef = databaseHandler.instances.users.child(UID)
  if (!databaseHandler.hasSnapshot(userRef)) return false
  const friendSnapshot = await databaseHandler.getSnapshot(userRef.child("contacts/friends"))
  const friendSnapshotValue = friendSnapshot.val()
  const pendingSnapshot = await databaseHandler.getSnapshot(userRef.child("contacts/pending"))
  const pendingSnapshotValue = pendingSnapshot.val()
  const blockedSnapshot = await databaseHandler.getSnapshot(userRef.child("contacts/pending"))
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
      const client_userRef = databaseHandler.instances.users.child(CInstance.UID), target_userRef = databaseHandler.instances.users.child(UID)
      if (!CInstance || (CInstance.UID == UID) || !databaseHandler.hasSnapshot(client_userRef) || !databaseHandler.hasSnapshot(target_userRef)) return false
      if (requestType == "send") {
        const client_friendsSnapshot = await databaseHandler.getSnapshot(client_userRef.child("contacts/friends"))
        const client_friendsSnapshotValue = client_friendsSnapshot.val()
        const client_blockedSnapshot = await databaseHandler.getSnapshot(client_userRef.child("contacts/blocked"))
        const client_blockedSnapshotValue = client_blockedSnapshot.val()
        const target_pendingSnapshot = await databaseHandler.getSnapshot(target_userRef.child("contacts/pending"))
        const target_pendingSnapshotValue = target_pendingSnapshot.val()
        const target_blockedSnapshot = await databaseHandler.getSnapshot(target_userRef.child("contacts/blocked"))
        const target_blockedSnapshotValue = target_blockedSnapshot.val()
        if (client_friendsSnapshotValue[UID] || client_blockedSnapshotValue[UID] || target_pendingSnapshotValue[(CInstance.UID)] || target_blockedSnapshotValue[(CInstance.UID)]) return false
        const cDate = new Date()
        target_userRef.child("contacts/pending").update({
          [(CInstance.UID)]: cDate
        })
        return true
      }
      else {
        const client_pendingSnapshot = await databaseHandler.getSnapshot(client_userRef.child("contacts/pending"))
        const client_pendingSnapshotValue = client_pendingSnapshot.val()
        if (!client_pendingSnapshotValue[UID]) return false
        if (requestType == "accept") {
          const cDate = new Date()
          client_userRef.child("contacts/pending").update({
            [UID]: null
          })
          client_userRef.child("contacts/friends").update({
            [UID]: cDate
          })
          target_userRef.child("contacts/friends").update({
            [(CInstance.UID)]: cDate
          })
          return true
        }
        else if (requestType == "reject") {
          client_userRef.child("contacts/pending").update({
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
      const client_userRef = databaseHandler.instances.users.child(CInstance.UID), target_userRef = databaseHandler.instances.users.child(UID)
      if (!CInstance || (CInstance.UID == UID) || !databaseHandler.hasSnapshot(client_userRef) || !databaseHandler.hasSnapshot(target_userRef)) return false
      const client_blockedSnapshot = await databaseHandler.getSnapshot(client_userRef.child("contacts/blocked"))
      const client_blockedSnapshotValue = client_blockedSnapshot.val()
      if (requestType == "block") {
        if (client_blockedSnapshotValue[UID]) return false
        const cDate = new Date()
        client_userRef.child("contacts/pending").update({
          [UID]: null
        })
        client_userRef.child("contacts/friends").update({
          [UID]: null
        })
        target_userRef.child("contacts/pending").update({
          [(CInstance.UID)]: null
        })
        target_userRef.child("contacts/friends").update({
          [(CInstance.UID)]: null
        })
        client_userRef.child("contacts/blocked").update({
          [UID]: cDate
        })
        target_userRef.child("contacts/blocked").update({
          [(CInstance.UID)]: cDate
        })
        return true
      }
      else if (requestType == "unblock") {
        if (!client_blockedSnapshotValue[UID]) return false
        client_userRef.child("contacts/blocked").update({
          [UID]: null
        })
        target_userRef.child("contacts/blocked").update({
          [(CInstance.UID)]: null
        })
        return true
      }
      return false
    })
  }
}