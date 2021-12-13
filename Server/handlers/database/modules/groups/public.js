/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: database: modules: groups: public.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Public Group Module
----------------------------------------------------------------*/


/*----------
-- Module --
----------*/

const moduleName = "publicGroup", moduleDependencies = {}
const CModule = {
  REF: "\"APP_PUBLIC_GROUPS\"",
  prefix: "pblcgrp"
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
  moduleDependencies.utils = databaseModule.databaseUtils
  moduleDependencies.instances = databaseInstances
  moduleDependencies.instances[moduleName] = CModule
  moduleDependencies.server.query(`CREATE TABLE IF NOT EXISTS ${CModule.REF}("UID" BIGSERIAL PRIMARY KEY, "DOC" TIMESTAMP WITH TIME ZONE DEFAULT now())`)
}