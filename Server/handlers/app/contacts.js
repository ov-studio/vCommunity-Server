/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: app: contacts.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Contacts Handler
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const eventServer = require("../../servers/event")
const databaseHandler = require("../database/loader")
const instanceHandler = require("./instance")


/*------------
-- Handlers --
------------*/

async function getUserContacts(UID, socket, ...parameters) {
  if (!UID && !socket) return false
  if (!UID) {
    const socketInstance = instanceHandler.getInstancesBySocket(socket)
    if (!socketInstance) return false
    UID = socketInstance.UID
  }
  if (!UID) return false

  return databaseHandler.instances.user.dependencies.contacts.functions.fetchContacts(UID, ...parameters)
}

async function syncUserContacts(UID, socket) {
  if (!UID && !socket) return false
  let fetchedInstances = null
  if (!fetchedInstances) {
    if (!UID) {
      const socketInstance = instanceHandler.getInstancesBySocket(socket)
      if (socketInstance) {
        UID = socketInstance.UID
        fetchedInstances = socketInstance.instances
      }
    } else {
      fetchedInstances = instanceHandler.getInstancesByUID(UID)
    } 
  }
  if (!fetchedInstances) return false

  // TODO: ADD PARAM TO SYNC TO PARTICULAR USER INSTANCE
  const fetchedContacts = await getUserContacts(UID)
  if (!fetchedContacts) return false
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    clientInstance[1].emit("App:Contacts:onSync", fetchedContacts) 
  })
  return true
}
eventServer.on("App:Contacts:onSync", syncUserContacts)


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Contacts:onClientFriendRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const CInstances = instanceHandler.getInstancesBySocket(this)
    if (!CInstances) return false

    if (requestType == "send") {
      var queryResult = await databaseHandler.instances.user.functions.isUsernameExisting(UID, true)
      if (!queryResult || (CInstances.UID == queryResult.UID)) return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      UID = queryResult.UID
      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandlerutils.fetchSoloResult(queryResult)
      if (queryResult) {
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/recepient-blocked"})
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      }
      queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      queryResult = databaseHandlerutils.fetchSoloResult(queryResult)
      if (queryResult) {
        if (queryResult.type == "pending") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/pending"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/sender-blocked"})
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      }
      var preparedQuery = databaseHandlerutils.prepareQuery({
        UID: CInstances.UID,
        type: "pending"
      })
      await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/successful"})
    } else {
      if ((CInstances.UID == UID) || !await databaseHandler.instances.user.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.user.functions.isUserExisting(UID)) return false
      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandlerutils.fetchSoloResult(queryResult)
      if (!queryResult || (queryResult.type != "pending")) return false

      if (requestType == "accept") {
        const groupUID = await databaseHandler.instances.personalGroup.functions.constructor({
          senderUID: UID,
          receiverUID: CInstances.UID
        })
        if (!groupUID) return false
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
        var preparedQuery = databaseHandlerutils.prepareQuery({
          UID: UID,
          type: "friends",
          group: groupUID
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        preparedQuery = databaseHandlerutils.prepareQuery({
          UID: CInstances.UID,
          type: "friends",
          group: groupUID
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      } else if (requestType == "reject") {
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      } else {
        return false
      }
    }
    await syncUserContacts(CInstances.UID)
    await syncUserContacts(UID)
    eventServer.emit("App:Groups:Personal:onSync", CInstances.UID, null)
    eventServer.emit("App:Groups:Personal:onSync", UID, null)
    return true
  })

  socket.on("App:Contacts:onClientBlockRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const CInstances = instanceHandler.getInstancesBySocket(this)
    if (!CInstances || (CInstances.UID == UID) || !await databaseHandler.instances.user.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.user.functions.isUserExisting(UID)) return false

    var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
    queryResult = databaseHandlerutils.fetchSoloResult(queryResult)
    if (requestType == "block") {
      if (queryResult) {
        if (queryResult.type == "blocked") return false 
        else await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      }
      var preparedQuery = databaseHandlerutils.prepareQuery({
        UID: UID,
        type: "blocked"
      })
      await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      queryResult = databaseHandlerutils.fetchSoloResult(queryResult)
      if (queryResult && (queryResult.type != "blocked")) await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
    } else if (requestType == "unblock") {
      if (queryResult && (queryResult.type != "blocked")) return false
      await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
    } else {
      return false
    }
    await syncUserContacts(CInstances.UID)
    await syncUserContacts(UID)
    eventServer.emit("App:Groups:Personal:onSync", CInstances.UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", UID, null, true)
    return true
  })
})

module.exports = {
  getUserContacts,
  syncUserContacts
}