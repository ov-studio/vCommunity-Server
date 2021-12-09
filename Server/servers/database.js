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
  databaseServer,

  async isTableExisting(tableName) {
    if (!tableName) return false
    const queryResult = await databaseServer.query(`SELECT "tablename" FROM "pg_tables" WHERE "schemaname" = '${databaseCert.database.schema}' AND "tablename" = '${tableName}'`)
    return (queryResult && (queryResult.rows.length > 0)) || false
  },

  prepareQuery(queryDatas) {
    if (!queryDatas) return false
    let valueIDs = "", valueID = 0
    const columns = [], values = []
    Object.entries(queryDatas).forEach(function(queryData) {
      valueIDs += (valueID == 0) ? `$1` : `, $${valueID + 1}`
      valueID = valueID + 1
      columns.push("\"" + String(queryData[0]) + "\"")
      values.push(queryData[1])
    })
    return {columns, valueIDs, values}
  },

  fetchSoloResult(queryResult) {
    return (queryResult && queryResult.rows && (queryResult.rows.length > 0) && queryResult.rows[0]) || false
  }
}