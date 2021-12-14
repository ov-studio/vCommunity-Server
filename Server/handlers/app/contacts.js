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
  UID = UID || instanceHandler.getInstancesBySocket(socket, true)
  return databaseHandler.instances.user.dependencies.contacts.functions.fetchContacts(UID, ...parameters)
}

async function syncUserContacts(UID, socket, syncInstances) {
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

  if (!syncInstances) {
    if (!socket) return false
    else fetchedInstances = {[(socket.id)]: socket}
  }
  Object.entries(fetchedInstances).forEach(function(clientInstance) {
    clientInstance[1].emit("App:Contacts:onSync", fetchedContacts) 
  })
  return true
}
eventServer.on("App:Contacts:onSync", syncUserContacts)

module.exports = {
  getUserContacts,
  syncUserContacts
}


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
      var queryResult = await databaseHandler.instances.user.dependencies.contacts.functions.fetchContact(CInstances.UID, UID)
      if (queryResult) {
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/recepient-blocked"})
      }
      queryResult = await databaseHandler.instances.user.dependencies.contacts.functions.fetchContact(UID, CInstances.UID)
      if (queryResult) {
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
        if (queryResult.type == "pending") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/pending"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/sender-blocked"})
      }

      var preparedQuery = databaseHandler.utils.prepareQuery({
        UID: CInstances.UID,
        type: "pending"
      })
      await databaseHandler.server.query(`INSERT INTO ${databaseHandler.instances.user.functions.getDependencyREF("contacts", UID)}(${preparedQuery.columns}) VALUES(${preparedQuery.valueIDs})`, preparedQuery.values)
      this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/successful"})
    }
    else {
      if (requestType == "accept") {
        if (!await databaseHandler.instances.user.dependencies.contacts.functions.addContact(CInstances.UID, UID)) return false
      } 
      else if (requestType == "reject") {
        await databaseHandler.server.query(`DELETE FROM ${databaseHandler.instances.user.functions.getDependencyREF("contacts", CInstances.UID)} WHERE "UID" = '${UID}'`)
      } 
      else if (requestType == "unfriend") {
        if (!await databaseHandler.instances.user.dependencies.contacts.functions.removeContact(CInstances.UID, UID)) return false
      }
      else return false
    }

    await syncUserContacts(CInstances.UID, null, true)
    await syncUserContacts(UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", CInstances.UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", UID, null, true)
    return true
  })

  socket.on("App:Contacts:onClientBlockRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const CInstances = instanceHandler.getInstancesBySocket(this)

    if (requestType == "block") {
      if (!await databaseHandler.instances.user.dependencies.contacts.functions.blockContact(CInstances.UID, UID)) return false
    }
    else if (requestType == "unblock") {
      if (!await databaseHandler.instances.user.dependencies.contacts.functions.unblockContact(CInstances.UID, UID)) return false
    }
    else return false

    await syncUserContacts(CInstances.UID, null, true)
    await syncUserContacts(UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", CInstances.UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", UID, null, true)
    return true
  })
})