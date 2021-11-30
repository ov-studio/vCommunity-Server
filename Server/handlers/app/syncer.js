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
const contactsHandler = require("./contacts")

eventServer.on("App:onClientConnect", async function(socket, UID) {
  //socket.emit("App:onSyncContacts", await contactsHandler.getContactsByUID(UID))
  console.log(UID)
})