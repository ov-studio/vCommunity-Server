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
  socket.on("Auth:onClientRegister", function(data) {
    const instanceReference = this
    databaseServer.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.username,
      emailVerified: false,
      disabled: false
    })
    .then(function({user}) {
      databaseHandler.instances.users.child(user.uid).set({
        birthDate: data.birthDate
      })
      instanceReference.emit("Auth:onClientRegister", {success: true})
    })
    .catch(function(error) {
      instanceReference.emit("Auth:onClientRegister", {error: error.code})
    })
  })
})