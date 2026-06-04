const OffersDb = require("../DbConnectDataset")

module.exports = {
  // POST /api/sponsors/:sponsorId/offers
  generateOffer: async (req: any, res: any) => {
    const { v4: uuidv4 } = await import("uuid")
    console.log("Received request to create offer with body:", req.body)
    const { sponsorId } = req.params
    const {
      // Core
      offer_title,
      tagline,
      cta_text,
      offer_value,
      badge_label,
      is_active,
      landing_url,
      offer_type_id,
      category_id,

      // About
      offer_desc,

      // What you get
      what_you_get,

      // Redeem steps
      redeem_step_01,
      redeem_step_02,
      redeem_step_03,
      redeem_step_04,

      // Coupon
      coupon_code,
      discount_amount,
      price_after_discount,

      // Sidebar
      audience,
      redemption_method,
      expires_days,

      // Terms & links
      terms,
      useful_link_1,
      useful_link_2,
      course_link,
      contact_email,

      // Tags (array of existing tag IDs)
      tag_ids = [],
    } = req.body

    // ── 1. Basic validation ───────────────────────────
    if (
      !offer_title ||
      !audience ||
      !redemption_method ||
      !expires_days ||
      !terms
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: offer_title, audience, redemption_method, expires_days, terms",
      })
    }

    const client = await OffersDb.connect()

    try {
      await client.query("BEGIN")

      // ── 2. Check sponsor exists ───────────────────────
      const sponsorCheck = await client.query(
        "SELECT id FROM sponsors WHERE id = $1",
        [sponsorId],
      )

      if (sponsorCheck.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ error: "Sponsor not found" })
      }

      // ── 3. Insert the offer ───────────────────────────
      const offerId = uuidv4()

      const insertOffer = await client.query(
        `INSERT INTO sponsor_offers (
    id, sponsor_id, offer_type_id,
    offer_title, tagline, cta_text, offer_value,
    badge_label, is_active, landing_url, offer_desc,
    what_you_get, redeem_step_01, redeem_step_02,
    redeem_step_03, redeem_step_04, coupon_code,
    discount_amount, price_after_discount, audience,
    redemption_method, expires_days, terms,
    useful_link_1, useful_link_2, course_link, contact_email
  ) VALUES (
    $1,  $2,  $3,  $4,  $5,  $6,  $7,
    $8,  $9,  $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20, $21,
    $22, $23, $24, $25, $26, $27
  )
  RETURNING *`,
        [
          offerId,
          sponsorId,
          offer_type_id,
          offer_title,
          tagline,
          cta_text,
          offer_value,
          badge_label,
          is_active ?? true,
          landing_url,
          offer_desc,
          what_you_get,
          redeem_step_01,
          redeem_step_02,
          redeem_step_03,
          redeem_step_04,
          coupon_code,
          discount_amount,
          price_after_discount,
          audience,
          redemption_method,
          expires_days,
          terms,
          useful_link_1,
          useful_link_2,
          course_link,
          contact_email,
        ],
      )

      // ── 4. Insert categories if provided ─────────────
      const category_ids = req.body.category_ids ?? []

      if (category_ids.length > 0) {
        const categoryCheck = await client.query(
          "SELECT id FROM category WHERE id = ANY($1::uuid[])",
          [category_ids],
        )

        if (categoryCheck.rows.length !== category_ids.length) {
          await client.query("ROLLBACK")
          return res
            .status(400)
            .json({ error: "One or more category_ids are invalid" })
        }

        const categoryValues = category_ids
          .map((_: any, i_: number) => `($1, $${i_ + 2})`)
          .join(", ")

        await client.query(
          `INSERT INTO offer_categories (offer_id, category_id) VALUES ${categoryValues}`,
          [offerId, ...category_ids],
        )
      }

      await client.query("COMMIT")

      // ── 5. Return created offer with tags ─────────────
      const newOffer = insertOffer.rows[0]
      delete newOffer.contact_email

      return res.status(201).json({
        message: "Offer created successfully",
        offer: {
          ...newOffer,
          tags: tag_ids,
        },
      })
    } catch (error) {
      await client.query("ROLLBACK")
      console.error("Error creating offer:", error)
      return res.status(500).json({ error: "Internal server error" })
    } finally {
      client.release()
    }
  },
  getOffers: async (req: any, res: any) => {
    console.log("Received request to fetch offers")
    const client = await OffersDb.connect()
    try {
      const offers =
        await client.query(`select s.sponsor_name,s.sponsor_url, ot.offer_name as offer_type, s_o.offer_title , s_o.tagline    from sponsor_offers s_o
join sponsors s on sponsor_id = s.id
join offer_type ot on s_o.offer_type_id = ot.id
where s_o.is_active = true`)
      console.log("Fetched offers:", offers.rows)
      return res.status(200).json({ data: offers.rows })
    } catch (error) {
      console.error("Error fetching offers:", error)
      return res.status(500).json({ error: "Internal server error" })
    } finally {
      client.release()
    }
  },
}
