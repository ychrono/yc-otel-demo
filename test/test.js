// Node
const { promisify } = require('util')

// Npm
const test = require('ava')
const dotenv = require('dotenv')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

// Local
const data = require('./data.json')

// Functions
const deepCopy = obj => JSON.parse(JSON.stringify(obj))

// Main
let charge = null

test.before(() => {
  dotenv.config({ path: '../.env' })

  const hipstershop = grpc.loadPackageDefinition(protoLoader.loadSync('../pb/demo.proto')).hipstershop

  const paymentClient = new hipstershop.PaymentService(`0.0.0.0:${process.env.PAYMENT_SERVICE_PORT}`, grpc.credentials.createInsecure())
  charge = promisify(paymentClient.charge).bind(paymentClient)
})

// --------------- Payment Service ---------------

test('payment: valid credit card', t => {
  const request = data.charge

  return charge(request).then(res => {
    t.truthy(res.transactionId)
  })
})

test('payment: invalid credit card', t => {
  const request = deepCopy(data.charge)
  request.creditCard.creditCardNumber = '0000-0000-0000-0000'

  return charge(request).catch(err => {
    t.is(err.details, 'Credit card info is invalid.')
  })
})

test('payment: amex credit card not allowed', t => {
  const request = deepCopy(data.charge)
  request.creditCard.creditCardNumber = '3714 496353 98431'

  return charge(request).catch(err => {
    t.is(err.details, 'Sorry, we cannot process amex credit cards. Only VISA or MasterCard is accepted.')
  })
})

test('payment: expired credit card', t => {
  const request = deepCopy(data.charge)
  request.creditCard.creditCardExpirationYear = 2021

  return charge(request).catch(err => {
    t.is(err.details, 'The credit card (ending 0454) expired on 1/2021.')
  })
})
