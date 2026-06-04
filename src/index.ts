require("dotenv").config()
import express, { Request, Response } from "express"
import { QueryResult } from "pg"
import { EntityTypes } from "./types/entityTypes"
const clientDataset = require("./DbConnectDataset")
var cors = require("cors")

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

const port = process.env.PORT || 5200

app.get("/", (req: Request, res: Response) => {
  res.send("Hello TypeScript + Express!")
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

const entitiesRoute = require("./routes/entitiesRoute")
app.use("/api/entities", entitiesRoute)

const offersRoutes = require("./routes/offersRoutes")
app.use("/api/offers", offersRoutes)

// app.get("/api/health", (req: Request, res: Response) => {
//   const t1 = req.query.t1 as string | undefined
//   const t2 = req.query.t2 as string | undefined
//   console.log("Received /api/health", { t1, t2 })
//   res.json({ status: "OK", t1, t2, timestamp: new Date().toISOString() })
// })

app.get("/api/dataset", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const offset = (page - 1) * limit

  try {
    const countResult: QueryResult<{ count: string }> =
      await clientDataset.query(
        'SELECT COUNT(*) FROM schemacoredataset."Entities"',
      )

    const totalItems = parseInt(countResult.rows[0].count)
    const totalPages = Math.ceil(totalItems / limit)

    const result: QueryResult<EntityTypes> = await clientDataset.query(
      `SELECT * FROM schemacoredataset."Entities" LIMIT $1 OFFSET $2`,
      [limit, offset],
    )

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (err) {
    console.error("Database error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})
