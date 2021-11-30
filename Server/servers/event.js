/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: servers: event.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Event Server
----------------------------------------------------------------*/


/*-----------
-- Imports --
-----------*/

const eventServer = new (require("events")).EventEmitter()

module.exports = eventServer