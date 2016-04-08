const fetch = require('isomorphic-fetch');
const config = require('configure')
const logger = require('../helpers/logger.js')
const mongo = require('../helpers/mongo.js')
const {execute, schedule} = require('../helpers/workers.js')
const api = require('../helpers/api.js')
const async = require('gw2e-async-promises')
const rarities = require('../static/rarities.js')
const categories = require('../static/categories.js')

const languages = ['en', 'de', 'fr', 'es']

async function initialize () {
  let collection = mongo.collection('items')
  collection.createIndex('id')
  collection.createIndex('lang')
  let exists = !!(await collection.find({}).limit(1).next())

  let loadItemsFunction = config.workers.item.reducedMemory ?
    reducedMemoryLoadItems :
    loadItems;

  if (!exists) {
    logger.info('not exist!')
    await execute(loadItemsFunction)
    logger.info('done not exist')
    await execute(loadItemPrices)
  }

  // Update the items once a day, at 2am
  schedule('0 0 2 * * *', loadItemsFunction, 60 * 60)

  // Update prices every 5 minutes (which is the gw2 cache time)
  schedule('*/5 * * * *', loadItemPrices)

  logger.info('Initialized item worker')
}

// A memory-reduced version of loadItems. Instead of loading all the items in
// memory, and causing a memory spike, it loads a language ad a time, splits
// the download in pages, and finally waits for the DB to read the data to
// write. The update thus takes longer, performing a trade-off between memory
// and time.
async function reducedMemoryLoadItems() {
  let collection = mongo.collection('items')

  // Iterate over all the languages
  for(let index in languages) {
    let lang = languages[index]
    let endpoint = api().language(lang).items()

    // Get the number of pages
    let response = await fetch('https://api.guildwars2.com/v2/items?page=0&page_size=' + endpoint.maxPageSize)
    let numPages = parseInt(response.headers.get('X-Page-Total'))

    // Iterate over the pages
    for(let page = 0; page < numPages; page++) {
      let items = await endpoint.page(page)
      let updateFunctions = []
      items.map(async item => {
        item = {...transformItem(item), lang: lang}
        updateFunctions.push(() => collection.update({id: item.id, lang: lang}, {'$set': item}, {upsert: true}))
      });
      await async.parallel(updateFunctions)
    }

  }
}

function loadItems () {
  return new Promise(async resolve => {
    let itemRequests = languages.map(lang => () => api().language(lang).items().all())
    let items = await async.parallel(itemRequests)

    // We save one row per item per language. This *does* take longer in
    // the worker, but it enables the server part to serve requests using nearly
    // no processing power, since it doesn't have to transform languages to
    // match the request. We could move the transforming to the mongodb server
    // using aggregates, but that's also processing for every request instead of a
    // little overhead when adding new items.
    let collection = mongo.collection('items')
    let updateFunctions = []

    for (let key in languages) {
      let lang = languages[key]
      let languageItems = items[key]
      languageItems.map(item => {
        item = {...transformItem(item), lang: lang}
        updateFunctions.push(() => collection.update({id: item.id, lang: lang}, {'$set': item}, {upsert: true}))
      })
    }

    await async.parallel(updateFunctions)
    resolve()
  })
}

function loadItemPrices () {
  return new Promise(async resolve => {
    let prices = await api().commerce().prices().all()
    let collection = mongo.collection('items')

    let updateFunctions = prices.map(price => () =>
      new Promise(async resolve => {
        // Find the item matching the price, update the price based on the first match
        // and then overwrite the prices for all matches (= all languages)
        let item = await collection.find({id: price.id, tradable: true}).limit(1).next()

        if (!item) return resolve()
        item = transformPrices(item, price)
        await collection.update({id: price.id}, {'$set': item}, {multi: true})
        resolve()
      })
    )

    await async.parallel(updateFunctions)
    resolve()
  })
}

// Transform an item into the expected legacy structure
function transformItem (item) {
  return {
    id: item.id,
    name: item.name,
    description: transformDescription(item.description),
    image: item.icon,
    level: transformLevel(item.level),
    vendor_price: item.vendor_value,
    rarity: transformRarity(item.rarity),
    skin: transformSkin(item.default_skin),
    tradable: transformTradable(item.flags),
    category: transformCategory(item.type, item.details)
  }
}

function transformLevel (level) {
  return level === 0 ? null : parseInt(level, 10)
}

function transformRarity (rarity) {
  return rarities[rarity]
}

function transformSkin (skin) {
  return skin ? parseInt(skin, 10) : null
}

function transformDescription (description) {
  if (!description || description === '') {
    return null
  }
  return description.replace(/<[^>]+>/ig, '')
}

function transformCategory (type, details) {
  let categoryIds = []

  if (type) {
    categoryIds.push(categories[type][0])
  }

  if (type && details && details.type) {
    categoryIds.push(categories[type][1][details.type])
  }

  return categoryIds
}

function transformTradable (flags) {
  let untradableFlags = ['AccountBound', 'MonsterOnly', 'SoulbindOnAcquire']
  return flags.filter(x => untradableFlags.indexOf(x) !== -1).length === 0
}

function transformPrices (item, prices) {
  let transformed = {
    buy: {
      quantity: prices.buys.quantity,
      price: prices.buys.unit_price,
      last_change: lastPriceChange(item.buy, prices.buys),
      last_known: prices.buys.unit_price || item.buy.price || item.buy.last_known
    },
    sell: {
      quantity: prices.sells.quantity,
      price: prices.sells.unit_price,
      last_change: lastPriceChange(item.sell, prices.sells),
      last_known: prices.sells.unit_price || item.sell.price || item.sell.last_known
    },
    last_update: isoDate()
  }

  if (item.crafting) {
    let craftPrice = item.craftingWithoutPrecursors || item.crafting
    transformed.craftingProfit = Math.round(transformed.sell.price * 0.85 - craftPrice.buy)
  }

  return transformed
}

function lastPriceChange (memory, current) {
  if (!memory) {
    return {quantity: 0, price: 0, time: isoDate()}
  }

  if (memory.quantity === current.quantity && memory.price === current.unit_price) {
    return memory.last_change
  }

  return {
    quantity: current.quantity - memory.quantity,
    price: current.unit_price - memory.price,
    time: isoDate()
  }
}

// Return the date as a ISO 8601 string
function isoDate (date) {
  date = date ? new Date(date) : new Date()
  return date.toISOString().slice(0, 19) + '+0000'
}

module.exports = {initialize, loadItems, loadItemPrices}
