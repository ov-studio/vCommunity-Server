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

async function getUserGroups(UID, socket) {
  if (!UID && !socket) return false
  if (!UID) {
    const socketInstance = instanceHandler.getInstancesBySocket(socket)
    if (!socketInstance) return false
    UID = socketInstance.UID
  }
  if (!UID) return false

  const fetchedContacts = await contactsHandler.getUserContacts(UID, null, "friends")
  if (!fetchedContacts) return false
  const fetchedGroups = []
  Object.entries(fetchedContacts).forEach(function(contactData) {
    fetchedGroups.push({
      groupUID: contactData[1].group,
      participantUID: contactData[1].UID
    })
  })
  return fetchedGroups
}

async function syncUserGroups(UID, socket) {
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

  const fetchedGroups = await getUserGroups(UID)
  if (!fetchedGroups) return false
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    fetchedGroups.forEach(function(groupData) {
      groupData.groupMessages = []
      clientInstance[1].join(databaseHandler.instances.personalGroups.prefix + "_" + groupData.groupUID)
      clientInstance[1].emit("App:onSyncPersonalGroups", groupData) 
    })
  })
  return true
}
eventServer.on("App:Group:Personal:onSyncClientGroups", syncUserGroups)

module.exports = {
  getUserGroups,
  syncUserGroups,

  injectSocket(socketServer, socket) {
    socket.on("App:Group:Personal:onClientActionInput", async function(actionData) {
      if (!actionData || !actionData.groupUID || !actionData.message || (typeof(actionData.message) != "string") || (actionData.message.length <= 0)) return false
      const client_instance = instanceHandler.getInstancesBySocket(this)
      if (!client_instance || !await databaseHandler.instances.users.functions.isUserExisting(client_instance.UID)) return false

      const queryResult = await databaseHandler.instances.personalGroups.dependencies.messages.functions.createMessage(databaseHandler.instances.personalGroups.functions.getDependencyREF("messages", actionData.groupUID), {
        message: actionData.message,
        owner: client_instance.UID
      })
      console.log(queryResult)
      if (queryResult) socketServer.of("/app").to(databaseHandler.instances.personalGroups.prefix + "_" + actionData.groupUID).emit("App:onSyncPersonalGroups", queryResult)
      return true
    })
  }
}