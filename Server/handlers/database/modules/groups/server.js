/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: modules: groups: server.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Server Group Module
----------------------------------------------------------------*/


/*----------
-- Module --
----------*/

const moduleName = "serverGroup", moduleDependencies = {}
const CModule = {
  REF: "\"APP_SERVER_GROUPS\"",
  prefix: "srvrgrp"
}


/*----------------------
-- Module's Functions --
----------------------*/

CModule.functions = {}


/*-------------------------
-- Module's Dependencies --
-------------------------*/

CModule.dependencies = {}


/*---------------------
-- Module's Injector --
---------------------*/

exports.injectModule = function(databaseModule, databaseInstances) {
  moduleDependencies.server = databaseModule.databaseServer
  moduleDependencies.utilities = databaseModule.databaseUtility
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule
  moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${CModule.REF}("UID" BIGSERIAL PRIMARY KEY, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
}