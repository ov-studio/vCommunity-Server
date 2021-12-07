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
      return socketReference.emit("Auth:onClientRegister", {status: error.code})
    }

    if (await databaseHandler.instances.users.functions.isUsernameExisting(userData.username)) return socketReference.emit("Auth:onClientRegister", {status: "auth/username-already-exists"})
    var constructorResult = await databaseHandler.instances.users.functions.constructor({
      UID: authResult.uid,
      email: userData.email,
      username: userData.username,
      DOB: JSON.stringify(userData.DOB)
    })
    if (!constructorResult) {
      authServer.auth().deleteUser(authResult.uid)
      return socketReference.emit("Auth:onClientRegister", {status: "auth/failed"})
    }
    socketReference.emit("Auth:onClientRegister", {success: true, status: "auth/successful"})
  })
})