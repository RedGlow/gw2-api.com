const mongodb = require('mongodb').MongoClient
const logger = require('./logger.js')
const config = require('configure')

const defaultUrl = config.database.url
let database

function connect (url) {
  url = url || defaultUrl

  return new Promise((resolve, reject) => {
    mongodb.connect(url, (err, db) => {
      if (err) {
        logger.error('Failed connecting to mongodb: ', err.message)
        return reject(err)
      }

      database = db
      logger.info('Connection established to ' + url)
      database.on('close', () => logger.error('Connection to mongodb closed'))
      database.on('reconnect', () => logger.info('Connection to mongodb reestablished'))

      resolve()
    })
  })
}

function collection (name) {
  return database.collection(name)
}

module.exports = {connect, collection, logger}
