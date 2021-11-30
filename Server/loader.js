/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: loader.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Module Loader
----------------------------------------------------------------*/


/*-----------
-- Servers --
-----------*/

require("./servers/database")
require("./servers/socket")
require("./servers/event")


/*------------
-- Handlers --
------------*/

require("./handlers/database")
require("./handlers/auth")
require("./handlers/app/loader")