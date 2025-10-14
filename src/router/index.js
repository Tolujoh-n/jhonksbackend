const express = require("express");
const authRouter = require("./authRouter");
const materialRouter = require("./materialRouter");
const binRouter = require("./binRouter");
const agentRouter = require("./agentRouter");
const saleRouter = require("./saleRouter");
const bankRouter = require("./bankRouter");
const adminRouter = require("./adminRouter");
const referralRouter = require("./referralRouter");
const rewardRouter = require("./rewardRouter");
const chatRouter = require("./chatRouter");
const notificationRouter = require("./notificationRouter");
const bountyRouter = require("./bountyRouter");

const router = express.Router();

// Mount all routes
router.use("/auth", authRouter);
router.use("/materials", materialRouter);
router.use("/bin", binRouter);
router.use("/agent", agentRouter);
router.use("/sales", saleRouter);
router.use("/bank", bankRouter);
router.use("/admin", adminRouter);
router.use("/referrals", referralRouter);
router.use("/rewards", rewardRouter);
router.use("/chat", chatRouter);
router.use("/notifications", notificationRouter);
router.use("/bounty", bountyRouter);

module.exports = router;
