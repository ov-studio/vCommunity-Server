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
const personalGroupHandler = require("./groups/personal")

eventServer.on("App:onClientConnect", async function(socket, UID) {
  personalGroupHandler.syncClientGroups(UID, socket, true)
})