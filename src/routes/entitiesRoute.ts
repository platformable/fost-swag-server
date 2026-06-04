const express = require("express")

const controller = require("../controllers/entitiesControllers")

const entitiesRouter = express.Router()

entitiesRouter.get("/", controller.getEntities)

module.exports = entitiesRouter
