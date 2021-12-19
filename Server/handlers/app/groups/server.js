/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: groups: server.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Server Group Handler
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
  return databaseHandler.instances.user.dependencies.serverGroups.functions.fetchGroups(UID)
}

// TODO: ALLOW UNFORCED SYNC (DELETE GROUP WHICH ISN'T NEEDED ANYMORE INSTEAD OF FORCE RESETTING EVERYTHING)
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

  console.log("FETCHED GROUPS: ")
  console.log(fetchedGroups)
  if (!syncInstances) {
    if (!socket) return false
    else fetchedInstances = {[(socket.id)]: socket}
  }
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    clientInstance[1].emit("App:Groups:Server:onSync", fetchedGroups)
    console.log("FETCHED SERVERS: ")
    console.log(fetchedGroups)
    fetchedGroups.forEach(function(groupData) {
      const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(groupData.UID)
      clientInstance[1].join(groupRoom)
    })
  })
  /*
  fetchedGroups.forEach(async function(groupData) {
    const groupMessages = await databaseHandler.instances.serverGroup.dependencies.messages.functions.fetchMessages(databaseHandler.instances.serverGroup.functions.getDependencyREF("messages", groupData.UID))
    if (groupMessages) {
      Object.entries(fetchedInstances).forEach(function(clientInstance) {
        clientInstance[1].emit("App:Groups:Server:onSyncMessages", {
          UID: groupData.UID,
          messages: groupMessages
        })
      }) 
    }
  })
  */
  return true
}
eventServer.on("App:Groups:Server:onSync", syncUserGroups)

module.exports = {
  getUserGroups,
  syncUserGroups
}


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Groups:Server:onClientCreateGroup", async function(requestData) {
    console.log(requestData)
    if (!requestData) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance) return false

    const groupUID = await databaseHandler.instances.serverGroup.functions.constructor({
      name: requestData.name,
      owner: socketInstance.UID
    })
    if (!groupUID) return false
    eventServer.emit("App:Groups:Server:onSync", UID, null, true)
    return true
  })

  /*
  socket.on("App:Groups:Personal:onClientFetchMessages", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.messageUID) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance || !await databaseHandler.instances.user.functions.isUserExisting(socketInstance.UID) || !await databaseHandler.instances.serverGroup.functions.isGroupExisting(requestData.UID)) return false

    const groupMessages = await databaseHandler.instances.serverGroup.dependencies.messages.functions.fetchMessages(databaseHandler.instances.serverGroup.functions.getDependencyREF("messages", requestData.UID), requestData.messageUID)
    if (!groupMessages) return false
    this.emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: groupMessages,
      isPostLoad: true
    })
    return true
  })

  socket.on("App:Groups:Personal:onClientSendMessage", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.message || (typeof(requestData.message) != "string") || (requestData.message.length <= 0)) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance || !await databaseHandler.instances.user.functions.isUserExisting(socketInstance.UID) || !await databaseHandler.instances.serverGroup.functions.isGroupExisting(requestData.UID)) return false

    const queryResult = await databaseHandler.instances.serverGroup.dependencies.messages.functions.createMessage(databaseHandler.instances.serverGroup.functions.getDependencyREF("messages", requestData.UID), {
      message: requestData.message,
      owner: socketInstance.UID
    })
    if (!queryResult) return false
    const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(requestData.UID)
    socketServer.of("/app").to(groupRoom).emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: [queryResult]
    })
    return true
  })
  */
})