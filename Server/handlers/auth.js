/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: handlers: auth.js
     Server: -
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Auth Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const databaseServer = require("../servers/database")
const socketServer = require("../servers/socket")


/*------------
-- Handlers --
------------*/

socketServer.of("/auth").on("connection", (socket) => {
  socket.on("Auth:onClientRegister", function(data) {
    const instanceReference = this
    databaseServer.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.username,
      emailVerified: false,
      disabled: false
    })
    .then(function(user) {
      instanceReference.emit("Auth:onClientRegister", {success: true})
    })
    .catch(function(error) {
      instanceReference.emit("Auth:onClientRegister", {error: error.code})
    })
  })
})