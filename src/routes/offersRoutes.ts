const expressOfferRoute = require("express")

const OfferController = require("../controllers/offersControllers")
const offersRouter = expressOfferRoute.Router()

offersRouter.get("/", OfferController.getOffers)
offersRouter.get("/:offerId", OfferController.getOfferById)
offersRouter.post("/:sponsorId/offers", OfferController.generateOffer)
offersRouter.post("/claim-offer", OfferController.claimOffer)

module.exports = offersRouter
