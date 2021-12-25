/*----------------------------------------------------------------
     Resource: vCommunity-Server
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

exports.getUserContacts = async function(UID, socket, ...parameters) {
  UID = UID || instanceHandler.getInstancesBySocket(socket, true)
  return databaseHandler.instances.user.dependencies.contacts.functions.fetchContacts(UID, ...parameters)
}

exports.syncUserContacts = async function(UID, socket, syncInstances) {
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
  const fetchedContacts = await exports.getUserContacts(UID)
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
eventServer.on("App:Contacts:onSync", exports.syncUserContacts)


/*----------------------------
-- Event: On Client Connect --
----------------------------*/

eventServer.on("App:onClientConnect", function(socket, UID) {
  socket.on("App:Contacts:onClientFriendRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const clientUID = instanceHandler.getInstancesBySocket(this, true)
    if (!clientUID) return false

    if (requestType == "send") {
      var queryResult = await databaseHandler.instances.user.functions.isUsernameExisting(UID, true)
      if (!queryResult || (clientUID == queryResult.UID)) return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})

      UID = queryResult.UID
      var queryResult = await databaseHandler.instances.user.dependencies.contacts.functions.fetchContact(clientUID, UID)
      if (queryResult) {
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/recepient-blocked"})
      }
      queryResult = await databaseHandler.instances.user.dependencies.contacts.functions.fetchContact(UID, clientUID)
      if (queryResult) {
        if (queryResult.type == "friends") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/failed"})
        if (queryResult.type == "pending") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/pending"})
        if (queryResult.type == "blocked") return this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/sender-blocked"})
      }
      const REF = await databaseHandler.instances.user.dependencies.contacts.functions.constructor(databaseHandler.instances.user.functions.getInstanceSchema(UID), true)
      await REF.create({
        UID: clientUID,
        type: "pending"
      })
      this.emit("App:Contacts:onClientFriendRequest", {status: "invitation/successful"})
    }
    else {
      if (requestType == "accept") {
        if (!await databaseHandler.instances.user.dependencies.contacts.functions.addContact(clientUID, UID)) return false
      } 
      else if (requestType == "reject") {
        try {
          const REF = await databaseHandler.instances.user.dependencies.contacts.functions.constructor(databaseHandler.instances.user.functions.getInstanceSchema(clientUID), true)
          await REF.destroy({
            where: {
              UID: UID
            }
          })
        } catch(error) {
          return false
        }
      } 
      else if (requestType == "unfriend") {
        if (!await databaseHandler.instances.user.dependencies.contacts.functions.removeContact(clientUID, UID)) return false
      }
      else return false
    }

    await exports.syncUserContacts(clientUID, null, true)
    await exports.syncUserContacts(UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", clientUID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", UID, null, true)
    return true
  })

  socket.on("App:Contacts:onClientBlockRequest", async function(UID, requestType) {
    if (!UID || !requestType) return false
    const clientUID = instanceHandler.getInstancesBySocket(this, true)
    if (!clientUID) return false

    if (requestType == "block") {
      if (!await databaseHandler.instances.user.dependencies.contacts.functions.blockContact(clientUID, UID)) return false
    }
    else if (requestType == "unblock") {
      if (!await databaseHandler.instances.user.dependencies.contacts.functions.unblockContact(clientUID, UID)) return false
    }
    else return false

    await exports.syncUserContacts(clientUID, null, true)
    await exports.syncUserContacts(UID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", clientUID, null, true)
    eventServer.emit("App:Groups:Personal:onSync", UID, null, true)
    return true
  })
})