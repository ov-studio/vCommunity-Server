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

const eventServer = require("../../servers/event")
const databaseHandler = require("../database/loader")
const contactsHandler = require("./contacts")
const personalGroupHandler = require("./groups/personal")


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", async function(socket, UID) {
  await contactsHandler.syncUserContacts(UID, socket)
  await personalGroupHandler.syncUserGroups(UID, socket)

  socket.on("App:User:Datas:OnSync", async function(UID) {
    var queryResult = await databaseHandler.instances.user.functions.isUserExisting(UID, true)
    if (!ueryResult) return false

    socket.emit("App:User:Datas:OnSync", queryResult)
    socket.join(databaseHandler.instances.user.functions.getRoomREF(UID))
  })
})