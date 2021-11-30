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
const contactInstances = {
  friends: "contacts/friends",
  pending: "contacts/pending",
  blocked: "contacts/blocked"
}


/*------------
-- Handlers --
------------*/

async function getContactsByUID(UID) {
  const userRef = databaseHandler.instances.users.child(UID)
  const contactsData = await databaseHandler.getSnapshot(userRef.child("contacts"), true)
  const userContacts = {}
  Object.entries(contactInstances).forEach(function(contactInstance) {
    userContacts[(contactInstance[0])] = (contactsData && contactsData[(contactInstance[0])]) || {}
  })
  return userContacts
}

async function getContactsBySocket(socket) {
  const client_instance = instanceHandler.getInstancesBySocket(socket)
  if (!client_instance) return false
  return await getContactsByUID(client_instance.UID)
}

async function syncClientContacts(UID, socket) {
  if (!UID && !socket) return false
  var clientInstances = null
  if (!UID) {
    const socketInstances = instanceHandler.getInstancesBySocket(socket)
    if (socketInstances) {
      UID = socketInstances.UID
      clientInstances = socketInstances.instances
    }
  } else {
    clientInstances = instanceHandler.getInstancesByUID(UID)
  }
  if (!clientInstances) return false

  const clientContacts = await getContactsByUID(UID)
  Object.entries(clientInstances).forEach(async function(clientInstance) {
    clientInstance[1].emit("App:onSyncContacts", clientContacts) 
  })
  return true
}

module.exports = {
  getContactsByUID: getContactsByUID,
  getContactsBySocket: getContactsBySocket,
  syncClientContacts: syncClientContacts,

  injectSocket(socketServer, socket) {
    socket.on("App:onClientFriendRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const client_instance = instanceHandler.getInstancesBySocket(this)
      const client_userRef = databaseHandler.instances.users.child(client_instance.UID), target_userRef = databaseHandler.instances.users.child(UID)
      if (!client_instance || (client_instance.UID == UID) || !await databaseHandler.hasSnapshot(client_userRef) || !await databaseHandler.hasSnapshot(target_userRef)) return false

      const client_contacts = await getContactsByUID(client_instance.UID)
      if (requestType == "send") {
        const target_contacts = await getContactsByUID(UID)
        if (client_contacts.friends[UID] || client_contacts.blocked[UID] || target_contacts.pending[(client_instance.UID)] || target_contacts.blocked[(client_instance.UID)]) return false
        const cDate = new Date()
        target_userRef.child(contactInstances.pending).update({
          [(client_instance.UID)]: cDate
        })
        return true
      }
      else {
        if (!client_contacts.pending[UID]) return false
        if (requestType == "accept") {
          const cDate = new Date()
          client_userRef.child(contactInstances.pending).update({
            [UID]: null
          })
          client_userRef.child(contactInstances.friends).update({
            [UID]: cDate
          })
          target_userRef.child(contactInstances.friends).update({
            [(client_instance.UID)]: cDate
          })
          return true
        }
        else if (requestType == "reject") {
          client_userRef.child(contactInstances.pending).update({
            [UID]: null
          })
          return true
        }
      }
      return false
    })

    socket.on("App:onClientBlockRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const client_instance = instanceHandler.getInstancesBySocket(this)
      const client_userRef = databaseHandler.instances.users.child(client_instance.UID), target_userRef = databaseHandler.instances.users.child(UID)
      if (!client_instance || (client_instance.UID == UID) || !await databaseHandler.hasSnapshot(client_userRef) || !await databaseHandler.hasSnapshot(target_userRef)) return false
  
      const client_contacts = await getContactsByUID(client_instance.UID)
      if (requestType == "block") {
        if (client_contacts.blocked[UID]) return false
        const cDate = new Date()
        client_userRef.child(contactInstances.pending).update({
          [UID]: null
        })
        client_userRef.child(contactInstances.friends).update({
          [UID]: null
        })
        target_userRef.child(contactInstances.pending).update({
          [(client_instance.UID)]: null
        })
        target_userRef.child(contactInstances.friends).update({
          [(client_instance.UID)]: null
        })
        client_userRef.child(contactInstances.blocked).update({
          [UID]: cDate
        })
        target_userRef.child(contactInstances.blocked).update({
          [(client_instance.UID)]: cDate
        })
        return true
      }
      else if (requestType == "unblock") {
        if (!client_contacts.blocked[UID]) return false
        client_userRef.child(contactInstances.blocked).update({
          [UID]: null
        })
        target_userRef.child(contactInstances.blocked).update({
          [(client_instance.UID)]: null
        })
        return true
      }
      return false
    })
  }
}