/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: groups: personal.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Personal Group Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const eventServer = require("../../../servers/event")
const databaseHandler = require("../../database")
const instanceHandler = require("../instance")
const contactsHandler = require("../contacts")


/*------------
-- Handlers --
------------*/

async function getGroupsByID(UID, preFetchedContacts) {
  const fetchedContacts = preFetchedContacts || await contactsHandler.getContactsByUID(UID)
  const fetchedGroups = []
  Object.entries(fetchedContacts.friends).forEach(function(contactData) {
    fetchedGroups.push({
      groupUID: contactData[1].UID,
      participantUID: contactData[0]
    })
  })
  return fetchedGroups
}

async function getGroupsBySocket(socket, preFetchedContacts) {
  const socketInstance = instanceHandler.getInstancesBySocket(socket)
  if (!socketInstance) return false
  return await getGroupsByID(socketInstance.UID, preFetchedContacts)
}

async function syncClientGroups(UID, socket, syncContacts) {
  if (!UID && !socket) return false
  let fetchedInstances = null
  if (!UID) {
    const socketInstance = instanceHandler.getInstancesBySocket(socket)
    if (socketInstance) {
      UID = socketInstance.UID
      fetchedInstances = socketInstance.instances
    }
  } else {
    fetchedInstances = instanceHandler.getInstancesByUID(UID)
  }
  if (!fetchedInstances) return false

  const fetchedContacts = await contactsHandler.getContactsByUID(UID)
  const fetchedGroups = await getGroupsByID(UID, null, fetchedContacts)
  if (syncContacts) contactsHandler.syncClientContacts(UID, socket, fetchedInstances, fetchedContacts)
  Object.entries(fetchedInstances).forEach(async function(clientInstance) {
    fetchedGroups.forEach(function(groupData) {
      clientInstance[1].join(groupData.groupUID)
      groupData.groupMessages = {}
      clientInstance[1].emit("App:onSyncPersonalGroups", groupData) 
    })
  })
  return true
}
eventServer.on("App:Group:Personal:onSyncClientGroups", syncClientGroups)

module.exports = {
  getGroupsByID: getGroupsByID,
  getGroupsBySocket: getGroupsBySocket,
  syncClientGroups: syncClientGroups,

  injectSocket(socketServer, socket) {
    socket.on("App:Group:Personal:onClientActionInput", async function(actionData) {
      if (!actionData || !actionData.groupUID || !actionData.message || (typeof(actionData.message) != "string") || (actionData.message.length <= 0)) return false
      const client_instance = instanceHandler.getInstancesBySocket(this)
      if (!client_instance) return false
      const client_userRef = databaseHandler.instances.users.child(client_instance.UID)
      if (!client_instance || !await databaseHandler.hasSnapshot(client_userRef)) return false

      // TODO: INTEGRATED TILL HERE..
      console.log(actionData)
      return true
    })
  }
}

/*
async function getGroupsByID222(UID, socket) {
  socketServer.of("/app").to("somegroup").emit('roomTestEmit', 'what is going on, party people?');
}
*/