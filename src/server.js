require('babel-polyfill')

// TODO use env variables somehow
// require('pmx').init({http: true})
// require('newrelic')

const restify = require('restify')
const config = require('configure')
const logger = require('./helpers/logger.js')
const mongo = require('./helpers/mongo.js')
const {setupRoutes, setupErrorHandling} = require('./routes.js')

// Connect to the database
mongo.connect()

// Setup a server and connect the routes
const server = restify.createServer({name: 'gw2-api.com'})
server.use(restify.queryParser())
server.use(restify.bodyParser())
setupRoutes(server)
setupErrorHandling(server)
const port = config.server.port || 8080;
server.listen(port, () => logger.info('Server listening on port ' + port))

// Export the server for testing purposes
module.exports = server
