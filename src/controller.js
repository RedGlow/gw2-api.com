class AbstractController {
  constructor (cache) {
    this.cache = cache
  }

  invalidParameters (response, next) {
    response.status(500)
    response.send({text: 'invalid request parameters'})
    return next()
  }

  requestLanguage (params) {
    return ['de', 'en', 'fr', 'es'].indexOf(params.lang) !== -1 ? params.lang : 'en'
  }

  multiParameter (param, integer = false, symbol = ',') {
    let type = typeof param

    if (type === 'undefined') {
      return []
    }

    if (type !== 'object') {
      param = param.split(symbol)
    }

    if (integer === true) {
      param = param.map(id => parseInt(id, 10))
    }

    return param
  }
}

module.exports = AbstractController
