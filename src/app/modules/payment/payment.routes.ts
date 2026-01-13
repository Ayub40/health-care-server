import express from 'express';

const router = express.Router();

// Webhook route is registered in app.ts before other middleware
// This file is kept for potential future payment-related routes

export const PaymentRoutes = router;







// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }), // important for signature verification
//   stripeWebhookHandler
// );