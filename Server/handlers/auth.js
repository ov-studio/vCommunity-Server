/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: auth.js
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
const databaseHandler = require("./database")


/*------------
-- Handlers --
------------*/

socketServer.of("/auth").on("connection", (socket) => {
  socket.on("Auth:onClientRegister", function(userData) {
    if (!userData) return false
    const socketReference = this
    databaseServer.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.username,
      emailVerified: false,
      disabled: false
    })
    .then(function(user) {
      databaseHandler.instances.users.child(user.uid).set({
        birthDate: userData.birthDate
      })
      socketReference.emit("Auth:onClientRegister", {success: true})
    })
    .catch(function(error) {
      socketReference.emit("Auth:onClientRegister", {error: error.code})
    })
  })
})