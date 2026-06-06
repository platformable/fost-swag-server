const Mailer = require("./mailer")

type Job = {
  id: string
  template: string
  to: string
  vars: any
  attempts?: number
}

const jobs: Job[] = []
let processing = false

function enqueue(template: string, to: string, vars: any = {}): string {
  const job: Job = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    template,
    to,
    vars,
    attempts: 0,
  }
  jobs.push(job)
  processNext()
  return job.id
}

async function processNext() {
  if (processing) return
  processing = true

  while (jobs.length > 0) {
    const job = jobs.shift()
    if (!job) break
    try {
      await Mailer.send(job.template, job.to, job.vars)
      console.log(`Email sent to ${job.to} (template=${job.template})`)
    } catch (err) {
      job.attempts = (job.attempts || 0) + 1
      console.error(`Email job failed (attempt ${job.attempts}):`, err)
      if (job.attempts < 3) {
        // simple backoff
        setTimeout(() => jobs.push(job), 1000 * job.attempts)
      } else {
        console.error(`Email job permanently failed:`, job)
      }
    }
    // small pause to avoid tight loop
    await new Promise((r) => setTimeout(r, 50))
  }

  processing = false
}

// start processing automatically when the module is required
process.nextTick(processNext)

module.exports = { enqueue }
