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

console.log(process.env.test)
console.log("loading?")

const databaseServer = require("firebase-admin")
const databaseCert = require("../../.cert-database.json")
databaseServer.initializeApp({
  credential: databaseServer.credential.cert(databaseCert.credentials),
  databaseURL: databaseCert.database
})

module.exports = databaseServer