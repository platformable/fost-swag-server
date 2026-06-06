const nodemailer = require("nodemailer")
const templates = require("./templates")

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

async function send(
  templateName: string,
  to: string,
  vars: any = {},
): Promise<any> {
  const tpl = templates.render(templateName, vars)
  const mail = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: tpl.subject,
    text: tpl.text,
  }

  return transporter.sendMail(mail)
}

module.exports = { send }
