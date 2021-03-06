/*----------------------------------------------------------------
     Resource: vCommunity-Server
     Script: handlers: database: loader.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Database Loader
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const databaseServer = require("../../servers/database")
const databaseInstances = {}
const databaseModules = [
  require("./user"),
  require("./groups/personal"),
  require("./groups/server")
]


/*------------
-- Handlers --
------------*/

databaseModules.forEach(function(dependency) {
  dependency.injectModule(databaseServer, databaseInstances)
})

module.exports = {
  driver: databaseServer.databaseDriver,
  server: databaseServer.databaseServer,
  instances: databaseInstances
}