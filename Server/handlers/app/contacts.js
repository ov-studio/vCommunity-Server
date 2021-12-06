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
const databaseHandler = require("../database")
const instanceHandler = require("./instance")


/*------------
-- Handlers --
------------*/

function getUserContacts(UID, socket, contactType) {
  if (!UID && !socket) return false
  if (!UID) {
    const socketInstance = instanceHandler.getInstancesBySocket(socket)
    if (!socketInstance) return false
    UID = socketInstance.UID
  }
  if (!UID) return false

  return databaseHandler.instances.users.dependencies.contacts.functions.getUserContacts(UID, contactType)
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

  const fetchedContacts = await getUserContacts(UID)
  if (!fetchedContacts) return false
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    clientInstance[1].emit("App:onSyncContacts", fetchedContacts) 
  })
  return true
}

module.exports = {
  getUserContacts,
  syncUserContacts,

  injectSocket(socketServer, socket) {
    socket.on("App:onClientFriendRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstances = instanceHandler.getInstancesBySocket(this)
      if (!CInstances || (CInstances.UID == UID) || !await databaseHandler.instances.users.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.users.functions.isUserExisting(UID)) return false

      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (requestType == "send") {
        if (queryResult && ((queryResult.type == "friends") || (queryResult.type == "blocked"))) return false
        queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        queryResult = databaseHandler.fetchSoloResult(queryResult)
        if (queryResult && ((queryResult.type == "friends") || (queryResult.type == "blocked"))) return false
        var preparedQuery = databaseHandler.prepareQuery({
          UID: UID,
          type: "pending"
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      } else {
        if (!queryResult || (queryResult.type != "pending")) return false
        if (requestType == "accept") {
          const groupUID = await databaseHandler.instances.personalGroups.functions.constructor({
            senderUID: UID,
            receiverUID: CInstances.UID
          })
          if (!groupUID) return false
          await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
          var preparedQuery = databaseHandler.prepareQuery({
            UID: UID,
            type: "friends",
            group: groupUID.UID
          })
          await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
          await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
          preparedQuery = databaseHandler.prepareQuery({
            UID: CInstances.UID,
            type: "friends",
            group: groupUID.UID
          })
          await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        } else if (requestType == "reject") {
          await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
        } else {
          return false
        }
      }
      eventServer.emit("App:Group:Personal:onSyncClientGroups", CInstances.UID, null, true)
      eventServer.emit("App:Group:Personal:onSyncClientGroups", UID, null, true)
      return true
    })

    socket.on("App:onClientBlockRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstances = instanceHandler.getInstancesBySocket(this)
      if (!CInstances || (CInstances.UID == UID) || !await databaseHandler.instances.users.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.users.functions.isUserExisting(UID)) return false

      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (requestType == "block") {
        if (queryResult) {
          if (queryResult.type == "blocked") return false 
          else await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
        }
        var preparedQuery = databaseHandler.prepareQuery({
          UID: UID,
          type: "blocked"
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        queryResult = databaseHandler.fetchSoloResult(queryResult)
        if (queryResult && (queryResult.type != "blocked")) await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      } else if (requestType == "unblock") {
        if (queryResult && (queryResult.type != "blocked")) return false
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      } else {
        return false
      }
      eventServer.emit("App:Group:Personal:onSyncClientGroups", CInstances.UID, null, true)
      eventServer.emit("App:Group:Personal:onSyncClientGroups", UID, null, true)
      return true
    })
  }
}
