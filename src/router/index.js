const express = require("express");
const authRouter = require("./authRouter");
const materialRouter = require("./materialRouter");
const binRouter = require("./binRouter");
const agentRouter = require("./agentRouter");
const saleRouter = require("./saleRouter");
const bankRouter = require("./bankRouter");
const adminRouter = require("./adminRouter");

const router = express.Router();

// Mount all routes
router.use("/auth", authRouter);
router.use("/materials", materialRouter);
router.use("/bin", binRouter);
router.use("/agent", agentRouter);
router.use("/sales", saleRouter);
router.use("/bank", bankRouter);
router.use("/admin", adminRouter);

module.exports = router;
