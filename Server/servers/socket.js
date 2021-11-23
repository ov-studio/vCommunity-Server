/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: servers: socket.js
     Server: -
     Author: OvileAmriam
     Developer(s): Aviril
     DOC: 22/11/2021 (OvileAmriam)
     Desc: Socket Server
----------------------------------------------------------------*/


/*-----------
━━ Imports ━━
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