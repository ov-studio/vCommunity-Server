/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: loader.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Database Loader
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

//const {databaseServer, databaseUtility, isTableExisting, prepareQuery, fetchSoloResult} = require("../../../servers/database")
const databaseServer = require("../../servers/database")
const databaseInstances = {}
const databaseModules = [
  require("./modules/user"),
  require("./modules/groups/personal")
]


/*------------
-- Handlers --
------------*/

databaseModules.forEach(function(dependency) {
  dependency.injectModule(databaseServer, databaseInstances)
})

module.exports = {
  server: databaseServer,
  instances: databaseInstances,
  isTableExisting: databaseServer.databaseUtility.isTableExisting,
  prepareQuery: databaseServer.databaseUtility.prepareQuery,
  fetchSoloResult: databaseServer.databaseUtility.fetchSoloResult
}