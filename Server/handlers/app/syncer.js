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
const databaseHandler = require("../database")
const contactsHandler = require("./contacts")
const personalGroupHandler = require("./groups/personal")


/*----------------------------------
-- Event (App): On Client Connect --
----------------------------------*/

eventServer.on("App:onClientConnect", async function(socket, UID, socketServer) {
  await contactsHandler.syncUserContacts(UID, socket)
  await personalGroupHandler.syncUserGroups(UID, socket)

  socket.on("App:User:Datas:OnSync", async function(UID) {
    var queryResult = await databaseHandler.instances.users.functions.isUserExisting(UID, true)
    if (queryResult) socket.emit("App:User:Datas:OnSync", queryResult)
  })
})