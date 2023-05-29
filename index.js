import cors from "cors"
import * as dotenv from "dotenv"
import express from "express"
import Stripe from "stripe"

// Get from env
dotenv.config()

const PORT = process.env.PORT

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY

const ALLOWED_DOMAINS = process.env.CORS_DOMAINS || ""
const WHITELIST = ALLOWED_DOMAINS.split(",").map((item) => item.trim())

// const express = require("express")
// Initial app with ExpressJS
const app = express()
app.use(express.static("public"))
app.use(express.json())

// Implement CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (WHITELIST.indexOf(origin) !== -1 || !origin) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
}
app.use(cors(corsOptions))

// This is a public sample test API key.
// Don’t submit any personally identifiable information in requests made with this key.
// Sign in to see your own test API key embedded in code samples.
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const stripe = new Stripe(STRIPE_SECRET_KEY)

app.get("/", (req, res) => {
  res.send({ message: "Hello World" })
})

app.get("/config", (req, res) => {
  res.send({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
  })
})

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    payment_method_types: ["card"],
  })

  res.send({
    clientSecret: paymentIntent.client_secret,
  })
})

app.post("/webhook", async (req, res) => {
  let data, eventType

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event
    let signature = req.headers["stripe-signature"]
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`)
      return res.sendStatus(400)
    }
    data = event.data
    eventType = event.type
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data
    eventType = req.body.type
  }

  if (eventType === "payment_intent.succeeded") {
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    console.log("💰 Payment captured!")
  } else if (eventType === "payment_intent.payment_failed") {
    console.log("❌ Payment failed.")
  }
  res.sendStatus(200)
})

app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`))
