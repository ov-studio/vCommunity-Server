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

const databaseServer = require("firebase-admin")
const databaseCert = process.env["cert-database"] || require("../../.cert-database.json")
console.log(databaseCert)
databaseServer.initializeApp({
  credential: databaseServer.credential.cert(databaseCert.credentials),
  databaseURL: databaseCert.database
})

module.exports = databaseServer