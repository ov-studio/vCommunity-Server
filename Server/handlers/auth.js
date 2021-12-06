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

const {authServer} = require("../servers/database")
const socketServer = require("../servers/socket")
const databaseHandler = require("./database")


/*------------
-- Handlers --
------------*/

socketServer.of("/auth").on("connection", (socket) => {
  socket.on("Auth:onClientRegister", async function(userData) {
    if (!userData) return false

    const socketReference = this
    var authResult = false
    try {
      authResult = await authServer.auth().createUser({
        email: userData.email,
        password: userData.password,
        emailVerified: false,
        disabled: false
      })
    } catch(error) {
      return socketReference.emit("Auth:onClientRegister", {error: authResult.code})
    }

    var constructorResult = await databaseHandler.instances.users.functions.constructor({
      UID: authResult.uid,
      username: userData.username,
      DOB: JSON.stringify(userData.birthDate)
    })
    if (!constructorResult) {
      authServer.auth().deleteUser(authResult.uid)
      return socketReference.emit("Auth:onClientRegister", {error: "query/constructor/failed"})
    }
    socketReference.emit("Auth:onClientRegister", {success: true})
  })
})