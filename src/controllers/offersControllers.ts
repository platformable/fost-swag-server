const OffersDb = require("../DbConnectDataset")
const emailQueue = require("../lib/emailQueue")

module.exports = {
  // POST /api/sponsors/:sponsorId/offers
  generateOffer: async (req: any, res: any) => {
    const { v4: uuidv4 } = await import("uuid")

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

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 100
    const search = req.query.search || ""
    console.log(
      `Pagination params - page: ${page}, limit: ${limit}, search: "${search}"`,
    )
    const offset = (page - 1) * limit

    const client = await OffersDb.connect()
    try {
      const params: any[] = []
      let searchCondition = ""

      if (search) {
        params.push(`%${search}%`)
        searchCondition = `AND (
          s.sponsor_name ILIKE $1 OR 
          s_o.offer_title ILIKE $1 OR 
          s_o.tagline ILIKE $1 OR
          ot.offer_name ILIKE $1
        )`
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM sponsor_offers s_o
        JOIN sponsors s ON s_o.sponsor_id = s.id
        JOIN offer_type ot ON s_o.offer_type_id = ot.id
        WHERE s_o.is_active = true ${searchCondition}
      `

      const countResult = await client.query(countQuery, params)
      const total = parseInt(countResult.rows[0].total)

      const limitParamIndex = params.length + 1
      const offsetParamIndex = params.length + 2
      params.push(limit, offset)

      const dataQuery = `
        SELECT 
          s.sponsor_name,
          s.sponsor_url, 
          ot.offer_name as offer_type, 
          s_o.offer_title, 
          s_o.tagline,
          s_o.id   
        FROM sponsor_offers s_o
        JOIN sponsors s ON s_o.sponsor_id = s.id
        JOIN offer_type ot ON s_o.offer_type_id = ot.id
        WHERE s_o.is_active = true ${searchCondition}
        ORDER BY s_o.created_at DESC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `

      const offers = await client.query(dataQuery, params)

      const totalPages = Math.ceil(total / limit)

      return res.status(200).json({
        data: offers.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      })
    } catch (error) {
      console.error("Error fetching offers:", error)
      return res.status(500).json({ error: "Internal server error" })
    } finally {
      client.release()
    }
  },
  getOfferById: async (req: any, res: any) => {
    const { offerId } = req.params

    const client = await OffersDb.connect()
    try {
      const offerResult = await client.query(
        `SELECT 
  s.sponsor_name,
  s.logo_url,s.sponsor_url,
  ot.offer_name AS offer_type,
  s_o.*,
  ARRAY_AGG(c.category_name) AS categories
FROM sponsor_offers s_o
JOIN sponsors s ON s_o.sponsor_id = s.id
JOIN offer_type ot ON s_o.offer_type_id = ot.id
LEFT JOIN offer_categories oc ON s_o.id = oc.offer_id
LEFT JOIN category c ON oc.category_id = c.id
WHERE s_o.id = $1
GROUP BY s.sponsor_name,s.sponsor_url, s.logo_url, ot.offer_name, s_o.id;
        `,
        [offerId],
      )

      if (offerResult.rows.length === 0) {
        return res.status(404).json({ error: "Offer not found" })
      }

      const offer = offerResult.rows[0]
      //delete offer.contact_email

      return res.status(200).json({ data: offer })
    } catch (error) {
      console.error("Error fetching offer:", error)
      return res.status(500).json({ error: "Internal server error" })
    } finally {
      client.release()
    }
  },
  claimOffer: async (req: any, res: any) => {
    console.log("Received request to claim offer with body:", req.body)
    const { email, sponsor_name, offer_title, contact_email, offer_id } =
      req.body

    if (!email) {
      return res.status(400).json({ error: "Missing email or offerId" })
    }
    // Persist claim record before sending emails
    const client = await OffersDb.connect()
    try {
      const insertSql = `INSERT INTO offer_leads (offer_id, offer_title, sponsor_name) VALUES ($1, $2, $3) RETURNING id`
      const insertRes = await client.query(insertSql, [
        offer_id,
        offer_title,
        sponsor_name,
      ])
      console.log("Inserted offer_claims id:", insertRes.rows[0]?.id)
    } catch (err) {
      console.error("Failed to persist claim record:", err)
      return res.status(500).json({ error: "Failed to save claim record" })
    } finally {
      client.release()
    }

    // Enqueue client confirmation email
    emailQueue.enqueue("client-claim", email, {
      offerTitle: offer_title,
      sponsorName: sponsor_name,
    })

    // Enqueue sponsor notification email

    emailQueue.enqueue("sponsor-claim", contact_email, {
      offerTitle: offer_title,
      sponsorName: sponsor_name,
      email,
      claimedAt: new Date().toLocaleString(),
    })

    console.log(`Enqueued confirmation and sponsor emails for ${email}`)
    return res.status(200).json({ message: "Offer claimed successfully" })
  },
}
