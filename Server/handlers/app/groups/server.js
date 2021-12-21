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
const socketRooms = {}


/*------------
-- Handlers --
------------*/

async function getUserGroups(UID, socket) {
  UID = UID || instanceHandler.getInstancesBySocket(socket, true)
  return databaseHandler.instances.user.dependencies.serverGroups.functions.fetchGroups(UID)
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
        const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(groupUID)
        clientInstance[1].leave(groupRoom)
      }
    })
    for (const groupIndex in fetchedGroups) {
      const groupData = fetchedGroups[groupIndex]
      if (!socketRooms[socketID][(groupData.UID)]) {
        reSyncGroups.push(groupData.UID)
        socketRooms[socketID][(groupData.UID)] = true
        const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(groupData.UID)
        clientInstance[1].join(groupRoom)
      }
    }
    clientInstance[1].emit("App:Groups:Server:onSync", fetchedGroups)
  })

  reSyncGroups.forEach(async function(groupUID) {
    const groupChannels = await databaseHandler.instances.serverGroup.dependencies.channels.functions.fetchChannels(groupUID)
    const groupMessages = {}
    for (const channelIndex in groupChannels) {
      const channelUID = groupChannels[channelIndex].UID
      //groupMessages[channelUID] = await databaseHandler.instances.serverGroup.dependencies.messages.functions.fetchChannels(groupUID, channelUID)
    }
    console.log("SERVER CHANNELS: ")
    console.log(groupChannels)
    Object.entries(fetchedInstances).forEach(function(clientInstance) {
      clientInstance[1].emit("App:Groups:Server:onSyncChannels", {
        UID: groupUID,
        channels: groupChannels
      })
    })
    /*
    const groupMessages = await databaseHandler.instances.serverGroup.dependencies.messages.functions.fetchMessages(groupUID)
    if (groupMessages) {
      Object.entries(fetchedInstances).forEach(function(clientInstance) {
        clientInstance[1].emit("App:Groups:Server:onSyncMessages", {
          UID: groupUID,
          messages: groupMessages
        })
      }) 
    }
    */
  })
  return true
}
eventServer.on("App:Groups:Server:onSync", syncUserGroups)

module.exports = {
  getUserGroups,
  syncUserGroups
}


/*----------------------------------------
-- Events: On Client Connect/Disconnect --
----------------------------------------*/

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Groups:Server:onClientCreateGroup", async function(requestData) {
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

  socket.on("App:Groups:Server:onClientCreateChannel", async function(requestData) {
    if (!requestData) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance) return false

    const channelUID = await databaseHandler.instances.serverGroup.dependencies.channels.functions.createChannel(requestData.UID, {
      name: requestData.name
    })
    if (!channelUID) return false
    const groupChannels = await databaseHandler.instances.serverGroup.dependencies.channels.functions.fetchChannels(requestData.UID)
    const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(requestData.UID)
    socketServer.of("/app").to(groupRoom).emit("App:Groups:Personal:onSyncChannels", {
      UID: groupUID,
      channels: groupChannels
    })
    return true
  })

  /*
  socket.on("App:Groups:Personal:onClientFetchMessages", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.messageUID) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance || !await databaseHandler.instances.user.functions.isUserExisting(socketInstance.UID) || !await databaseHandler.instances.serverGroup.functions.isGroupExisting(requestData.UID)) return false

    const groupMessages = await databaseHandler.instances.serverGroup.dependencies.messages.functions.fetchMessages(databaseHandler.instances.serverGroup.functions.getInstanceSchema("messages", requestData.UID), requestData.messageUID)
    if (!groupMessages) return false
    this.emit("App:Groups:Personal:onSyncMessages", {
      UID: requestData.UID,
      messages: groupMessages,
      isPostLoad: true
    })
    return true
  })
  */

  socket.on("App:Groups:Server:onClientSendMessage", async function(requestData) {
    if (!requestData || !requestData.UID || !requestData.channelUID || !requestData.message || (typeof(requestData.message) != "string") || (requestData.message.length <= 0)) return false
    const socketInstance = instanceHandler.getInstancesBySocket(this)
    if (!socketInstance) return false

    const queryResult = await databaseHandler.instances.serverGroup.dependencies.messages.functions.createMessage(requestData.UID, requestData.channelUID, {
      message: requestData.message,
      owner: socketInstance.UID
    })
    if (!queryResult) return false
    console.log(queryResult)
    const groupRoom = databaseHandler.instances.serverGroup.functions.getRoomREF(requestData.UID)
    socketServer.of("/app").to(groupRoom).emit("App:Groups:Server:onSyncMessages", {
      UID: requestData.UID,
      channelUID: requestData.channelUID,
      messages: [queryResult]
    })
    return true
  })
})

eventServer.on("App:onClientDisconnect", async function(UID) {
  delete socketRooms[UID]
})