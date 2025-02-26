const moviesController = require("../Controller/ReferController")
const Express = require("express")
const Router = Express.Router()
Router.route("/")
    .post(moviesController.refer)
module.exports = Router