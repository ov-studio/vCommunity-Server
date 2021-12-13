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
const databaseHandler = require("./database/loader")


/*------------
-- Handlers --
------------*/

socketServer.of("/auth").on("connection", (socket) => {
  socket.on("Auth:onClientLogin", async function(authData, isReAuthRequest) {
    if (!authData) return false

    var authResult = false
    try {
      authResult = await authServer.auth().getUserByEmail(authData.email)
    } catch(error) {
      return this.emit("Auth:onClientLogin", {status: error.code}, isReAuthRequest)
    }

    const queryResult = await databaseHandler.instances.user.functions.isUserExisting(authResult.uid, true)
    if (!queryResult) return this.emit("Auth:onClientLogin", {status: "auth/failed"}, isReAuthRequest)
    if (!isReAuthRequest) queryResult.password = authData.password
    this.emit("Auth:onClientLogin", queryResult, isReAuthRequest)
  })

  socket.on("Auth:onClientRegister", async function(authData) {
    if (!authData) return false

    var authResult = false
    try {
      authResult = await authServer.auth().createUser({
        email: authData.email,
        password: authData.password,
        emailVerified: false,
        disabled: false
      })
    } catch(error) {
      return this.emit("Auth:onClientRegister", {status: error.code})
    }

    const queryResult = await databaseHandler.instances.user.functions.constructor({
      UID: authResult.uid,
      email: authData.email,
      username: authData.username,
      DOB: JSON.stringify(authData.DOB)
    })
    if (!queryResult.success) authServer.auth().deleteUser(authResult.uid)
    this.emit("Auth:onClientRegister", queryResult)
  })
})