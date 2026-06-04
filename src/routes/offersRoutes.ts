const expressOfferRoute = require("express")

const OfferController = require("../controllers/offersControllers")
const offersRouter = expressOfferRoute.Router()

offersRouter.get("/", OfferController.getOffers)
offersRouter.post("/:sponsorId/offers", OfferController.generateOffer)

module.exports = offersRouter
