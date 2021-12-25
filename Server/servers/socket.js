/*----------------------------------------------------------------
     Resource: vCommunity-Server
     Script: servers: socket.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Socket Server
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const serverPort = process.env.PORT || 3001
const expressServer = require("express")().use(require("cors")())
const httpServer = require("http").Server(expressServer).listen(serverPort, () => {
  console.log(`━ vCommunity (Server) | Launched [Port: ${serverPort}]`)
})
const socketServer = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

module.exports = socketServer