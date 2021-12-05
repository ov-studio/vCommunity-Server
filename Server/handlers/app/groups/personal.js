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
const utilityHandler = require("../../utility")
const databaseHandler = require("../../database")
const instanceHandler = require("../instance")
const contactsHandler = require("../contacts")


/*------------
-- Handlers --
------------*/

async function getGroupsByUID(UID, preFetchedContacts) {
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
  return await getGroupsByUID(socketInstance.UID, preFetchedContacts)
}

async function prepareMessage(UID, groupUID, groupMessage) {
  if (!UID && !groupUID && !groupMessage) return false
  await utilityHandler.sleep(1)
  const timestamp = new Date().getTime()
  return {
    groupUID: groupUID,
    groupMessages: [
      {ownerUID: UID, messageUID: (UID + timestamp).toString(36), timestamp: timestamp, message: groupMessage}
    ]
  }
}

async function syncClientGroups(UID, socket, syncContacts) {
  if (!UID && !socket) return false
  if (!await databaseHandler.instances.users.functions.isUserExisting(UID)) return false
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
  const fetchedGroups = await getGroupsByUID(UID, null, fetchedContacts)
  if (syncContacts) contactsHandler.syncClientContacts(UID, socket, fetchedInstances, fetchedContacts)
  Object.entries(fetchedInstances).forEach(async function(clientInstance) {
    fetchedGroups.forEach(function(groupData) {
      groupData.groupMessages = []
      clientInstance[1].join(groupData.groupUID)
      clientInstance[1].emit("App:onSyncPersonalGroups", groupData) 
    })
  })
  return true
}
eventServer.on("App:Group:Personal:onSyncClientGroups", syncClientGroups)

module.exports = {
  getGroupsByUID: getGroupsByUID,
  getGroupsBySocket: getGroupsBySocket,
  syncClientGroups: syncClientGroups,

  injectSocket(socketServer, socket) {
    socket.on("App:Group:Personal:onClientActionInput", async function(actionData) {
      if (!actionData || !actionData.groupUID || !actionData.message || (typeof(actionData.message) != "string") || (actionData.message.length <= 0)) return false
      const client_instance = instanceHandler.getInstancesBySocket(this)
      if (!client_instance || !await databaseHandler.instances.users.functions.isUserExisting(client_instance.UID)) return false

      const preparedMessage = await prepareMessage(client_instance.UID, actionData.groupUID, actionData.message)
      socketServer.of("/app").to(actionData.groupUID).emit("App:onSyncPersonalGroups", preparedMessage)
      return true
    })
  }
}