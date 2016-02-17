/* eslint-env node, mocha */
const expect = require('chai').expect
const sinon = require('sinon')
const rewire = require('rewire')
const Module = rewire('../../src/controllers/item.js')

describe('controllers > item', () => {
  let controller
  let cache
  beforeEach(() => {
    cache = {items: {en: []}}
    controller = new Module(cache)
  })

  it('handles a request without parameters set', () => {
    let response = {send: sinon.spy(), status: sinon.spy()}
    let next = sinon.spy()

    controller.handle({params: {}}, response, next)
    expect(response.status.calledOnce).to.equal(true)
    expect(response.status.args[0][0]).to.deep.equal(500)
    expect(response.send.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal({text: 'invalid request parameters'})
  })

  it('can get an item by id', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', tradable: false})
    cache.items.en.push({id: 2, name: 'Bar', tradable: true})
    cache.items.en.push({id: 3, name: 'FooBar', tradable: true})

    controller.handle({params: {id: 2}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal(
      {id: 2, name: 'Bar', tradable: true}
    )
  })

  it('can get items by ids', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', tradable: false})
    cache.items.en.push({id: 2, name: 'Bar', tradable: true})
    cache.items.en.push({id: 3, name: 'FooBar', tradable: true})

    controller.handle({params: {ids: '2,3'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal([
      {id: 2, name: 'Bar', tradable: true},
      {id: 3, name: 'FooBar', tradable: true}
    ])
  })

  it('can get all tradable items', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', tradable: false})
    cache.items.en.push({id: 2, name: 'Bar', tradable: true})
    cache.items.en.push({id: 3, name: 'FooBar', tradable: true})
    cache.items.en.push({id: 4, name: 'Herp', tradable: false})

    controller.handle({params: {ids: 'all'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal([
      {id: 2, name: 'Bar', tradable: true},
      {id: 3, name: 'FooBar', tradable: true}
    ])
  })

  it('can get all items prices', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', prices: {buy: {price: 0}, sell: {price: 123}}})
    cache.items.en.push({id: 2, name: 'Bar', prices: {buy: {price: 456}, sell: {price: 0}}})
    cache.items.en.push({id: 3, name: 'FooBar'})
    cache.items.en.push({id: 4, name: 'Herp', prices: {buy: {price: 678}, sell: {price: 910}}})

    controller.handle({params: {ids: 'all-prices'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal([
      {id: 1, price: 123},
      {id: 2, price: 456},
      {id: 4, price: 910}
    ])
  })

  it('can get the item categories', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    controller.handle({params: {ids: 'categories'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)

    let categories = response.send.args[0][0]
    expect(categories).to.be.an.object
    expect(Object.keys(categories).length).to.be.above(10)
  })

  it('can get the items by name', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', tradable: false})
    cache.items.en.push({id: 2, name: 'Bar', tradable: true})
    cache.items.en.push({id: 3, name: 'FooBar', tradable: true})

    controller.handle({params: {ids: 'by-name', names: 'Foo,bAr'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal([
      {id: 1, name: 'Foo', tradable: false},
      {id: 2, name: 'Bar', tradable: true}
    ])
  })

  it('can get the items by skin', () => {
    let response = {send: sinon.spy(), cache: sinon.spy()}
    let next = sinon.spy()

    cache.items.en.push({id: 1, name: 'Foo', skin: 42})
    cache.items.en.push({id: 2, name: 'Bar'})
    cache.items.en.push({id: 3, name: 'FooBar', skin: 123})
    cache.items.en.push({id: 4, name: 'Herp', skin: 42})

    controller.handle({params: {ids: 'by-skin', skin_id: '42'}}, response, next)
    expect(response.cache.calledOnce).to.equal(true)
    expect(response.send.calledOnce).to.equal(true)
    expect(next.calledOnce).to.equal(true)
    expect(response.send.args[0][0]).to.deep.equal([1, 4])
  })
})