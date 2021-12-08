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
  socket.on("Auth:onClientLogin", async function(userData) {
    if (!userData) return false

    const socketReference = this
    var authResult = false
    try {
      authResult = await authServer.auth().getUserByEmail(userData.email)
    } catch(error) {
      return socketReference.emit("Auth:onClientLogin", {status: error.code})
    }

    const queryResult = await databaseHandler.instances.users.functions.isUserExisting(authResult.uid, true)
    if (!queryResult) return socketReference.emit("Auth:onClientLogin", {status: "auth/failed"})
    queryResult.password = userData.password
    socketReference.emit("Auth:onClientLogin", queryResult)
  })

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

    const queryResult = await databaseHandler.instances.users.functions.constructor({
      UID: authResult.uid,
      email: userData.email,
      username: userData.username,
      DOB: JSON.stringify(userData.DOB)
    })
    if (!queryResult.success) authServer.auth().deleteUser(authResult.uid)
    socketReference.emit("Auth:onClientRegister", queryResult)
  })
})