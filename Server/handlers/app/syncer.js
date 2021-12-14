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
const contactsHandler = require("./contacts")
const personalGroupHandler = require("./groups/personal")


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", async function(socket, UID) {
  const userRoom = databaseHandler.instances.user.functions.getRoomREF(UID)
  const clientDatas = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
  socket.join(userRoom)

  await contactsHandler.syncUserContacts(UID, socket)
  await personalGroupHandler.syncUserGroups(UID, socket)
  socketServer.of("/app").to(userRoom).emit("App:User:Datas:OnSync", clientDatas, true)

  socket.on("App:User:Datas:OnSync", async function(UID) {
    var queryResult = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
    if (!queryResult) return false

    socket.emit("App:User:Datas:OnSync", queryResult)
    socket.join(databaseHandler.instances.user.functions.getRoomREF(UID))
  })
})
