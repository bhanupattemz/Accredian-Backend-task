const Express = require("express")
const app = Express()
const ExpressError = require("./Utils/ExpressError")
const cors=require("cors")
require("dotenv").config()
const ReferRouter = require("./Routers/ReferRouter")
const verifyRouter = require("./Routers/VerifyRouter")
app.use(cors());
app.use(Express.json())
app.use(Express.urlencoded({ extended: true }))

app.use('/api/v1/verify', verifyRouter)
app.use("/api/v1/refer", ReferRouter)
app.use("/*", (req, res, next) => {
    next(new ExpressError("Page Not Found", 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err
    console.log(err)
    if (!err.message) err.message = "some thing wents Wrong";
    res.status(statusCode).json({
        statusCode: err.statusCode,
        message: err.message
    })
})

module.exports = app