const Express = require("express")
const Router = Express.Router()
const VerifyController = require("../Controller/VerifyController")
Router.route("/generate")
    .post(VerifyController.generate)

Router.route("/otp")
    .post(VerifyController.verify)

module.exports = Router