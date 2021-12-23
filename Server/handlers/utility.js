/*----------------------------------------------------------------
     Resource: vClient (Server)
     Script: handlers: utility.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 23/11/2021
     Desc: Utility Handler
----------------------------------------------------------------*/


/*-------------------
-- Utility Handler --
-------------------*/

exports.lodash = require("lodash")

exports.sleep = function(milliseconds) {
  if (!milliseconds) return false

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}
  
exports.parseMS = function(milliseconds) {
  if (!milliseconds) return false

  return {
    hours: Math.floor((milliseconds/(1000*60 *60)) % 24),
    minutes: Math.floor((milliseconds/(1000*60)) % 60),
    seconds: Math.floor((milliseconds/1000) % 60),
    milliseconds: parseInt((milliseconds%1000) / 100)
  }
}

exports.castDayTimeStamp = function(timestamp, days, isReverse) {
  if (!timestamp || !days) return false

  timestamp = new Date(timestamp)
  return new Date(timestamp.setDate(timestamp.getDate() + (((isReverse && -1) || 1)*days)))
}