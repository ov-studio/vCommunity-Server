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
const socketRooms = {}


/*------------
-- Handlers --
------------*/

async function getUserGroups(UID, socket) {
  UID = UID || instanceHandler.getInstancesBySocket(socket, true)
  return databaseHandler.instances.user.dependencies.personalGroups.functions.fetchGroups(UID)
}

async function syncUserGroups(UID, socket, syncInstances) {
  if (!UID && !socket) return false

  var fetchedInstances = null
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

  var reSyncGroups = []
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    const socketID = clientInstance[1].id
    if (!socketRooms[socketID]) socketRooms[socketID] = {}
    Object.keys(socketRooms[socketID]).forEach(function(groupUID) {
      let isGroupMember = false
      for (const groupIndex in fetchedGroups) {
        const groupData = fetchedGroups[groupIndex]
        if (groupUID == groupData.UID) {
          isGroupMember = true
          break
        }
      }
      if (!isGroupMember) {
        delete socketRooms[socketID][groupUID]
        const groupRoom = databaseHandler.instances.personalGroup.functions.getRoomREF(groupUID)
        clientInstance[1].leave(groupRoom)
      }
    })
    for (const groupIndex in fetchedGroups) {
      const groupData = fetchedGroups[groupIndex]
      if (!socketRooms[socketID][(groupData.UID)]) {
        reSyncGroups.push(groupData.UID)
        socketRooms[socketID][(groupData.UID)] = true
        const groupRoom = databaseHandler.instances.personalGroup.functions.getRoomREF(groupData.UID)
        clientInstance[1].join(groupRoom)
      }
    }
    clientInstance[1].emit("App:Groups:Personal:onSync", fetchedGroups)
  })

  reSyncGroups.forEach(async function(groupUID) {
    const groupMessages = await databaseHandler.instances.personalGroup.dependencies.messages.functions.fetchMessages(groupUID)
    if (groupMessages) {
      Object.entries(fetchedInstances).forEach(function(clientInstance) {
        clientInstance[1].emit("App:Groups:Personal:onSyncMessages", {
          UID: groupUID,
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
  socket.on("App:Groups:Personal:onClientFetchMessages", async function(requestData) {
    if (!requestData) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance) return false

    const groupMessages = await databaseHandler.instances.personalGroup.dependencies.messages.functions.fetchMessages(requestData.UID, requestData.messageUID, socketInstance.UID)
    if (!groupMessages) return false
    this.emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: groupMessages,
      isPostLoad: true
    })
    return true
  })

  socket.on("App:Groups:Personal:onClientSendMessage", async function(requestData) {
    if (!requestData) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance) return false

    const queryResult = await databaseHandler.instances.personalGroup.dependencies.messages.functions.createMessage(requestData.UID, {
      message: requestData.message,
      owner: socketInstance.UID
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