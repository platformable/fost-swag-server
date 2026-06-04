const db = require("../DbConnectDataset")

module.exports = {
  getEntities: async (req: any, res: any) => {
    try {
      const result = await db.query("SELECT * FROM sponsors")
      res.json(result.rows)
    } catch (error) {
      console.error("Error fetching entities:", error)
      res.status(500).json({ error: "Internal Server Error" })
    }
  },
}
