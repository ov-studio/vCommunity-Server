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
    let result = await authServer.auth().createUser({
      email: userData.email,
      password: userData.password,
      emailVerified: false,
      disabled: false
    })

    if (!result) return socketReference.emit("Auth:onClientRegister", {error: result.code})
    result = await databaseHandler.instances.users.constructor({
      uid: result.uid,
      username: userData.username,
      dob: JSON.stringify(userData.birthDate)
    })
    if (!result) {
      authServer.auth().deleteUser(result.uid)
      return socketReference.emit("Auth:onClientRegister", {error: result})
    }
    socketReference.emit("Auth:onClientRegister", {success: true})
  })
})