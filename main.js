let LinvoDB = require("linvodb3");
// The following two lines are very important
// Initialize the default store to level-js - which is a JS-only store which will work without recompiling in NW.js / Electron
LinvoDB.defaults.store = {db: require("level-js")}; // Comment out to use LevelDB instead of level-js
// Set dbPath - this should be done explicitly and will be the dir where each model's store is saved
LinvoDB.dbPath = process.cwd();

global.LinvoDB = LinvoDB;