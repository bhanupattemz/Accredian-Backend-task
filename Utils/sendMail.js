const nodemailer = require("nodemailer");
require("dotenv").config()
async function sendMail(options) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  async function main() {
    try {
      const info = await transporter.sendMail({
        from: process.env.MAIL,
        to: options.mail,
        subject: options.subject,
        text: options.text,
        html: `${options.message}`,
        attachments: options?.attachments,
      });
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }
  return main()
}
module.exports = sendMail

