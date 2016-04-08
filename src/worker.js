require('babel-polyfill')
const config = require('configure')
const logger = require('./helpers/logger.js')
const mongo = require('./helpers/mongo.js')
const itemWorker = require('./workers/item.js')
const gemWorker = require('./workers/gem.js')
const skinWorker = require('./workers/skin.js')
const recipeWorker = require('./workers/recipe.js')

const workers = [
  { condition: config.workers.item.start,
    method: itemWorker.initialize },
  { condition: config.workers.gem.start,
    method: gemWorker.initialize },
  { condition: config.workers.skin.start,
    method: skinWorker.initialize },
  { condition: config.workers.recipe.start,
    method: recipeWorker.initialize }
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
