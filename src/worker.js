require('babel-polyfill')
const config = require('configure')
const logger = require('./helpers/logger.js')
const mongo = require('./helpers/mongo.js')
const itemWorker = require('./workers/item.js')
const gemWorker = require('./workers/gem.js')
const skinWorker = require('./workers/skin.js')
const recipeWorker = require('./workers/recipe.js')

const workers = [
  { condition: config.workers.startItem,
    method: itemWorker.initialize },
  { condition: config.workers.startGem,
    method: itemWorker.initialize },
  { condition: config.workers.startSkin,
    method: itemWorker.initialize },
  { condition: config.workers.startRecipe,
    method: itemWorker.initialize }
]

// Connect to the DB and get working! :)
mongo.connect().then(() => {
  let promises = workers
    .filter(worker => worker.condition)
    .map(worker => worker.method())
  Promise
    .all(promises)
    .catch(e => {
      logger.error(e);
    })
})
