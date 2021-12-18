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
authServer.initializeApp({
  credential: authServer.credential.cert(databaseCert.auth)
})
databaseDriver.fetchSoloResult = function(queryResult) {
  return (queryResult && (queryResult.length > 0) && queryResult[0]) || false
}

module.exports = {
  authServer,
  databaseDriver,
  databaseServer
  /*
  databaseUtils: {
    async isTableExisting(tableName) {
      if (!tableName) return false

      const queryResult = await databaseServer.query(`SELECT "tablename" FROM "pg_tables" WHERE "schemaname" = '${databaseCert.database.schema}' AND "tablename" = '${tableName}'`)
      return (queryResult && (queryResult.rows.length > 0)) || false
    }
  }
  */
}

var Posts = databaseServer.define('posSts', {
    UID: {
        type: databaseDriver.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
      type: databaseDriver.STRING
    },
    content: {
      type: databaseDriver.STRING
    }
  }, {});

  /*
  var Posts = databaseServer.define('posSts', {
    UID: {
        type: databaseDriver.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    DOB:{
      type: databaseDriver.DATE,
      defaultValue: databaseDriver.fn('NOW'),
    },
    title: {
      type: databaseDriver.STRING
    },
    content: {
      type: databaseDriver.STRING
    }
  }, {});
  */

  //moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${CModule.REF}("UID" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "username" TEXT UNIQUE NOT NULL, "DOB" JSON NOT NULL, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)

  Posts.sync({force: true}).then(async function () {
      var lol = await Posts.create({
        UID: 33,
        title: 'Getting Started with PostgreSQL and Sequelize',
        content: 'Hello there'
      });
      console.log(lol)
  });