/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: loader.js
     Server: -
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


/*------------
-- Handlers --
------------*/

require("./handlers/database")
require("./handlers/auth")