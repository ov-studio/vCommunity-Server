/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: servers: database.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Database Server
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const authServer = require("firebase-admin")
const databaseCert = (process.env["cert_database"] && JSON.parse(process.env["cert_database"])) || require("../../.cert-database.json")
const databaseDriver = require("sequelize")
const databaseServer = new databaseDriver(databaseCert.database)
databaseServer.isAuthorized = databaseServer.authenticate()
authServer.initializeApp({
  credential: authServer.credential.cert(databaseCert.auth)
})

databaseDriver.createREF = async function(defName, skipSync, defData, defOptions) {
  var createdREF = databaseServer.define(defName, defData, defOptions)
  if (!skipSync) {
    await databaseServer.isAuthorized
    await databaseServer.createSchema(defOptions.schema)
    return createdREF.sync()
  }
  else return createdREF
}
databaseDriver.destroyREF = function(refInstance, dropOptions) {
  return refInstance.drop(dropOptions)
}
databaseDriver.destroySchema = function(schema) {
  return databaseServer.dropSchema(schema, {cascade: true})
}
databaseDriver.fetchSoloResult = function(queryResult) {
  return (queryResult && queryResult[0]) || false
}

module.exports = {
  authServer,
  databaseDriver,
  databaseServer,
  defaultSchema: "app"
}