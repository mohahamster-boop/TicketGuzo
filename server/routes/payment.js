const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/initialize", async (req, res) => {
  try {
    const {
      amount,
      email,
      first_name,
      last_name,
      phone_number,
      booking_id
    } = req.body;

    const tx_ref = `TICKETGUZO-${booking_id}-${Date.now()}`;

    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: String(amount),
        currency: "ETB",
        email,
        first_name,
        last_name,
        phone_number,
        tx_ref,

        callback_url:
          `${process.env.CLIENT_URL}/payment/callback?tx_ref=${tx_ref}`,

        return_url:
          `${process.env.CLIENT_URL}/payment/success?tx_ref=${tx_ref}`,

        customization: {
          title: "TicketGuzo",
          description: "Bus ticket payment"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      checkout_url: response.data.data.checkout_url,
      tx_ref
    });

  } catch (error) {
    console.error(
      "Chapa initialization error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Unable to initialize payment"
    });
  }
});

module.exports = router;