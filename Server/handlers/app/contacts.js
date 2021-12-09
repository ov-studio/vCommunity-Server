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

async function getUserContacts(UID, socket, contactType) {
  if (!UID && !socket) return false
  if (!UID) {
    const socketInstance = instanceHandler.getInstancesBySocket(socket)
    if (!socketInstance) return false
    UID = socketInstance.UID
  }
  if (!UID) return false
  if (!await databaseHandler.instances.users.functions.isUserExisting(UID)) return false
  if (contactType && (contactTypes.indexOf(contactType) == -1)) return false

  if (contactType) {
    var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)} WHERE type = '${contactType}'`)
    return (queryResult && queryResult.rows) || false
  }
  var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)}`)
  if (queryResult && (queryResult.rows.length > 0)) {
    queryResult = utilityHandler.lodash.groupBy(queryResult.rows, function(contactData) {
      const contactType = contactData.type
      delete contactData.type
      return contactType
    })
  }
  const fetchedContacts = {}
  contactTypes.forEach(function(contactInstance) {
    fetchedContacts[contactInstance] = (queryResult && queryResult[contactInstance]) || {}
  })
  return fetchedContacts
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
    clientInstance[1].emit("App:Contacts:onSync", fetchedContacts) 
  })
  return true
}

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Contacts:onClientFriendRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const CInstances = instanceHandler.getInstancesBySocket(this)
    if (!CInstances) return false

    if (requestType == "send") {
      var queryResult = await databaseHandler.instances.users.functions.isUsernameExisting(UID, true)
      if (!queryResult || (CInstances.UID == queryResult.UID)) return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      UID = queryResult.UID
      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (queryResult) {
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/recepient-blocked"})
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      }
      queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (queryResult) {
        if (queryResult.type == "pending") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/pending"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/sender-blocked"})
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
      }
      var preparedQuery = databaseHandler.prepareQuery({
        UID: CInstances.UID,
        type: "pending"
      })
      await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/successful"})
    } else {
      if ((CInstances.UID == UID) || !await databaseHandler.instances.users.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.users.functions.isUserExisting(UID)) return false
      var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (!queryResult || (queryResult.type != "pending")) return false

      if (requestType == "accept") {
        const groupUID = await databaseHandler.instances.personalGroups.functions.constructor({
          senderUID: UID,
          receiverUID: CInstances.UID
        })
        if (!groupUID) return false
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
        var preparedQuery = databaseHandler.prepareQuery({
          UID: UID,
          type: "friends",
          group: groupUID
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
        preparedQuery = databaseHandler.prepareQuery({
          UID: CInstances.UID,
          type: "friends",
          group: groupUID
        })
        await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      } else if (requestType == "reject") {
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
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
    if (!CInstances || (CInstances.UID == UID) || !await databaseHandler.instances.users.functions.isUserExisting(CInstances.UID) || !await databaseHandler.instances.users.functions.isUserExisting(UID)) return false

    var queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
    queryResult = databaseHandler.fetchSoloResult(queryResult)
    if (requestType == "block") {
      if (queryResult) {
        if (queryResult.type == "blocked") return false 
        else await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      }
      var preparedQuery = databaseHandler.prepareQuery({
        UID: UID,
        type: "blocked"
      })
      await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      queryResult = await databaseHandler.server.query(`SELECT * FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
      queryResult = databaseHandler.fetchSoloResult(queryResult)
      if (queryResult && (queryResult.type != "blocked")) await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", UID)} WHERE "UID" = '${CInstances.UID}'`)
    } else if (requestType == "unblock") {
      if (queryResult && (queryResult.type != "blocked")) return false
      await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.users.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
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