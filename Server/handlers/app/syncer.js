/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: syncer.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Instance Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const socketServer = require("../../servers/socket")
const eventServer = require("../../servers/event")
const databaseHandler = require("../database/loader")
const instanceHandler = require("./instance")
const contactsHandler = require("./contacts")
const personalGroupHandler = require("./groups/personal")
const serverGroupHandler = require("./groups/server")


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", async function(socket, UID) {
  const userRoom = databaseHandler.instances.user.functions.getRoomREF(UID)
  socket.join(userRoom)
  socket.on("App:User:Datas:OnSync", async function(UID) {
    var queryResult = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
    if (!queryResult) return false

    socket.emit("App:User:Datas:OnSync", queryResult)
    socket.join(databaseHandler.instances.user.functions.getRoomREF(UID))
  })

  const clientDatas = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
  socketServer.of("/app").to(userRoom).emit("App:User:Datas:OnSync", clientDatas, true)

  await contactsHandler.syncUserContacts(UID, socket)
  await personalGroupHandler.syncUserGroups(UID, socket)
  await serverGroupHandler.syncUserGroups(UID, socket)
})

eventServer.on("App:onClientDisconnect", async function(UID) {
  const userRoom = databaseHandler.instances.user.functions.getRoomREF(UID)
  const clientDatas = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
  const fetchedInstances = instanceHandler.getInstancesByUID(UID)
  
  if (!fetchedInstances) {
    socketServer.of("/app").to(userRoom).emit("App:User:Datas:OnSync", clientDatas, true)
  }
})