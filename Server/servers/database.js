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

const databaseModule = require("pg")
const authServer = require("firebase-admin")
const databaseCert = (process.env["cert_database"] && JSON.parse(process.env["cert_database"])) || require("../../.cert-database.json")
const databaseServer = new databaseModule.Pool(databaseCert.database)
authServer.initializeApp({
  credential: authServer.credential.cert(databaseCert.auth),
})

module.exports = {
  authServer,
  databaseServer
}