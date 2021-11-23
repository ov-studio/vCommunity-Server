/*----------------------------------------------------------------
     Resource: vClient--Server
     Script: loader.js
     Server: -
     Author: OvileAmriam
     Developer(s): Aviril
     DOC: 22/11/2021 (OvileAmriam)
     Desc: Module Loader
----------------------------------------------------------------*/


/*-----------
━━ Servers ━━
-----------*/

require("./servers/database")
require("./servers/socket")


/*------------
━━ Handlers ━━
------------*/

require("./handlers/database")
require("./handlers/auth")