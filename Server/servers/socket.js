/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: servers: socket.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Socket Server
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const serverPort = 3001
const expressServer = require("express")().use(require("cors")())
const httpServer = require("http").Server(expressServer).listen(serverPort)
const socketServer = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

module.exports = socketServer