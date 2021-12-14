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

const socketServer = require("../../../servers/socket")
const eventServer = require("../../../servers/event")
const databaseHandler = require("../../database/loader")
const instanceHandler = require("../instance")


/*------------
-- Handlers --
------------*/

async function getUserGroups(UID, socket) {
  UID = UID || instanceHandler.getInstancesBySocket(socket, true)
  return databaseHandler.instances.user.dependencies.groups.functions.fetchPersonalGroups(UID)
}

async function syncUserGroups(UID, socket, syncInstances) {
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

  if (!syncInstances) {
    if (!socket) return false
    else fetchedInstances = {[(socket.id)]: socket}
  }
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    fetchedGroups.forEach(function(groupData) {
      const groupRoom = databaseHandler.instances.personalGroup.functions.getRoomREF(groupData.UID)
      clientInstance[1].emit("App:Groups:Personal:onSync", fetchedGroups)
      clientInstance[1].join(groupRoom)
    })
  })
  fetchedGroups.forEach(async function(groupData) {
    const groupMessages = await databaseHandler.instances.personalGroup.dependencies.messages.functions.fetchMessages(databaseHandler.instances.personalGroup.functions.getDependencyREF("messages", groupData.UID))
    if (groupMessages) {
      Object.entries(fetchedInstances).forEach(function(clientInstance) {
        clientInstance[1].emit("App:Groups:Personal:onSyncMessages", {
          UID: groupData.UID,
          messages: groupMessages
        })
      }) 
    }
  })
  return true
}
eventServer.on("App:Groups:Personal:onSync", syncUserGroups)

module.exports = {
  getUserGroups,
  syncUserGroups
}


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Group:Personal:onClientFetchMessages", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.messageUID) return false
    const client_instance = instanceHandler.getInstancesBySocket(this)
    if (!client_instance || !await databaseHandler.instances.user.functions.isUserExisting(client_instance.UID) || !await databaseHandler.instances.personalGroup.functions.isGroupExisting(requestData.UID)) return false

    const groupMessages = await databaseHandler.instances.personalGroup.dependencies.messages.functions.fetchMessages(databaseHandler.instances.personalGroup.functions.getDependencyREF("messages", requestData.UID), requestData.messageUID)
    if (!groupMessages) return false
    this.emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: groupMessages,
      isPostLoad: true
    })
    return true
  })

  socket.on("App:Group:Personal:onClientSendMessage", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.message || (typeof(requestData.message) != "string") || (requestData.message.length <= 0)) return false
    const client_instance = instanceHandler.getInstancesBySocket(this)
    if (!client_instance || !await databaseHandler.instances.user.functions.isUserExisting(client_instance.UID) || !await databaseHandler.instances.personalGroup.functions.isGroupExisting(requestData.UID)) return false

    const queryResult = await databaseHandler.instances.personalGroup.dependencies.messages.functions.createMessage(databaseHandler.instances.personalGroup.functions.getDependencyREF("messages", requestData.UID), {
      message: requestData.message,
      owner: client_instance.UID
    })
    if (!queryResult) return false
    const groupRoom = databaseHandler.instances.personalGroup.functions.getRoomREF(requestData.UID)
    socketServer.of("/app").to(groupRoom).emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: [queryResult]
    })
    return true
  })
})