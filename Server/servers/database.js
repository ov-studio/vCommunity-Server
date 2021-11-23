/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: servers: database.js
     Server: -
     Author: OvileAmriam
     Developer(s): Aviril
     DOC: 22/11/2021 (OvileAmriam)
     Desc: Database Server
----------------------------------------------------------------*/


/*-----------
━━ Imports ━━
-----------*/

const databaseServer = require("firebase-admin")
const databaseCert = require("../../.cert-database.json")
databaseServer.initializeApp({
  credential: databaseServer.credential.cert(databaseCert.credentials),
  databaseURL: databaseCert.database
})

module.exports = databaseServer