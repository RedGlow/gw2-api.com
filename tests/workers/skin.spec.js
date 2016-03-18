/* eslint-env node, mocha */
const expect = require('chai').expect
const sinon = require('sinon')
const rewire = require('rewire')

const worker = rewire('../../src/workers/skin.js')
const mongo = require('../../src/helpers/mongo.js')
mongo.logger.quiet(true)

const executeMock = sinon.spy()
worker.__set__('execute', executeMock)

const scheduleMock = sinon.spy()
worker.__set__('schedule', scheduleMock)

describe('workers > skin worker', () => {
  before(async () => {
    await mongo.connect('mongodb://127.0.0.1:27017/gw2api-test')
  })

  beforeEach(async () => {
    await mongo.collection('cache').deleteMany({})
    await mongo.collection('items').deleteMany({})
    executeMock.reset()
    scheduleMock.reset()
  })

  it('initializes correctly without data', async () => {
    await mongo.collection('items').insert({id: 1, hint: 'placeholder item'})
    await worker.initialize()

    expect(executeMock.callCount).to.equal(1)
    expect(executeMock.args[0][0].name).to.equal('loadSkinList')

    expect(scheduleMock.callCount).to.equal(1)
    expect(scheduleMock.args[0][1].name).to.equal('loadSkinList')
  })

  it('initializes correctly with data', async () => {
    await mongo.collection('items').insert({id: 1, hint: 'placeholder item'})
    await mongo.collection('cache').insert({id: 'skinsToItems', content: 'i am some content'})
    await worker.initialize()

    expect(executeMock.callCount).to.equal(0)

    expect(scheduleMock.callCount).to.equal(1)
    expect(scheduleMock.args[0][1].name).to.equal('loadSkinList')
  })

  it('loads the skins and resolves into items', async () => {
    await mongo.collection('items').insert([
      {id: 1, name: 'Foo', skin: 1, lang: 'en'},
      {id: 2, name: 'Bar', lang: 'en'},
      {id: 3, name: 'Bar', lang: 'en'},
      {id: 4, name: 'Some Skin', lang: 'en'},
      {id: 5, name: 'Something about cake', lang: 'en'}
    ])

    worker.__set__('api', () => ({
      skins: () => ({
        all: () => [
          {id: 1, name: 'Foo'},
          {id: 2, name: 'Bar'},
          {id: 3, name: 'Some'},
          {id: 4, name: 'cake'},
          {id: 5, name: 'herp'}
        ]
      })
    }))

    await worker.loadSkinList()

    let content = (await mongo.collection('cache').find({id: 'skinsToItems'}).limit(1).next()).content
    expect(content).to.deep.equal({
      '1': [1],
      '2': [2, 3],
      '3': [4],
      '4': [5],
      '5': []
    })
  })

  it('resolves skins correctly', () => {
    let resolve = worker.__get__('resolveSkin')
    let items = [
      {id: 1, name: 'Foo', skin: 1},
      {id: 2, name: 'Bar'},
      {id: 3, name: 'Bar'},
      {id: 4, name: 'Some Skin'},
      {id: 5, name: 'Something about cake'}
    ]

    expect(resolve({id: 1, name: 'Foo'}, items)).to.deep.equal([1])
    expect(resolve({id: 2, name: 'Bar'}, items)).to.deep.equal([2, 3])
    expect(resolve({id: 3, name: 'Some'}, items)).to.deep.equal([4])
    expect(resolve({id: 4, name: 'cake'}, items)).to.deep.equal([5])
    expect(resolve({id: 5, name: 'herp'}, items)).to.deep.equal([])
  })
})
