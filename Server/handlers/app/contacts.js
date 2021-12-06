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
const utilityHandler = require("../utility")
const databaseHandler = require("../database")
const instanceHandler = require("./instance")
const contactTypes = ["friends", "pending", "blocked"]


/*------------
-- Handlers --
------------*/

async function getContactsByUID(UID) {
  if (!await databaseHandler.instances.users.functions.isUserExisting(UID)) return false
  var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)}`)
  queryResult = databaseHandler.fetchSoloResult(queryResult)
  if (queryResult) {
    queryResult = utilityHandler.lodash.groupBy(queryResult, function(contactData) {
      const contactState = contactData.state
      delete contactData.state
      return contactState
    })
  }

  const userContacts = {}
  contactTypes.forEach(function(contactInstance) {
    userContacts[contactInstance] = (queryResult && queryResult[contactInstance]) || {}
  })
  return userContacts
}

async function getContactsBySocket(socket) {
  const socketInstance = instanceHandler.getInstancesBySocket(socket)
  if (!socketInstance) return false
  return await getContactsByUID(socketInstance.UID)
}

async function syncClientContacts(UID, socket, preFetchedInstances, preFetchedContacts) {
  if (!UID && !socket) return false
  if (!await databaseHandler.instances.users.functions.isUserExisting(UID)) return false
  let fetchedInstances = preFetchedInstances || null
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

  const fetchedContacts = preFetchedContacts || await getContactsByUID(UID)
  Object.entries(fetchedInstances).forEach(async function(clientInstance) {
    clientInstance[1].emit("App:onSyncContacts", fetchedContacts) 
  })
  return true
}

module.exports = {
  getContactsByUID: getContactsByUID,
  getContactsBySocket: getContactsBySocket,
  syncClientContacts: syncClientContacts,

  injectSocket(socketServer, socket) {
    socket.on("App:onClientFriendRequest", async function(UID, requestType) {
      if (!UID || !requestType) return false
      const CInstances = instanceHandler.getInstancesBySocket(this)
      if (!CInstances || (CInstances.UID == UID) || !await databaseHandler.instances.users.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.users.functions.isUserExisting(UID)) return false

      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (requestType == "send") {
        if (queryResult && ((queryResult.state == "friends") || (queryResult.state == "blocked"))) return false
        queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        queryResult = databaseHandler.fetchSoloResult(queryResult)
        if (queryResult && ((queryResult.state == "friends") || (queryResult.state == "blocked"))) return false
        var preparedQuery = databaseHandler.prepareQuery({
          UID: UID,
          state: "pending"
        })
        await databaseServer.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      } else {
        if (!queryResult || (queryResult.state != "pending")) return false
        if (requestType == "accept") {
          const groupUID = await databaseHandler.instances.personalGroups.functions.constructor({
            senderUID: UID,
            receiverUID: CInstances.UID
          })
          if (!groupUID) return false
          await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
          var preparedQuery = databaseHandler.prepareQuery({
            UID: UID,
            state: "friends",
            group: groupUID.UID
          })
          await databaseServer.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
          await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
          preparedQuery = databaseHandler.prepareQuery({
            UID: CInstances.UID,
            state: "friends",
            group: groupUID.UID
          })
          await databaseServer.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
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
          if (queryResult.state == "blocked") return false 
          else await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
        }
        var preparedQuery = databaseHandler.prepareQuery({
          UID: UID,
          state: "blocked"
        })
        await databaseServer.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyRef("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        queryResult = databaseHandler.fetchSoloResult(queryResult)
        if (queryResult && (queryResult.state != "blocked")) await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyRef("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      } else if (requestType == "unblock") {
        if (queryResult && (queryResult.state != "blocked")) return false
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
