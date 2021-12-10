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

module.exports = {
  lodash: require("lodash"),

  sleep(milliseconds) {
    if (!milliseconds) return false
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds)
    })
  },
  
  parseMS(milliseconds) {
    if (!milliseconds) return false
    return {
      hours: Math.floor((milliseconds/(1000*60 *60)) % 24),
      minutes: Math.floor((milliseconds/(1000*60)) % 60),
      seconds: Math.floor((milliseconds/1000) % 60),
      milliseconds: parseInt((milliseconds%1000) / 100)
    }
  },

  castWeekTimeStamp(timestamp, weekAmount, isBackward) {
    if (!timestamp || !weekAmount) return false
    if (isBackward) timestamp.setDate(timestamp.getDate() - (7*weekAmount))
    else timestamp.setDate(timestamp.getDate() + (7*weekAmount))
    return timestamp
  }
}