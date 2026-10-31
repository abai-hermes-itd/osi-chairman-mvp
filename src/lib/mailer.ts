// Отправка писем без внешних библиотек.
// Провайдер Resend подключается переменными RESEND_API_KEY и MAIL_FROM.
// Без них в разработке (next dev) письмо печатается в консоль сервера, в production не отправляется.

export interface Mail {
  to: string
  subject: string
  text: string
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM

  if (apiKey && from) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    })
    if (!res.ok) {
      console.error("Почтовый провайдер вернул ошибку:", res.status)
      return false
    }
    return true
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[почта, режим разработки] Кому: ${mail.to}\n${mail.subject}\n\n${mail.text}\n`)
    return true
  }

  console.error("Почта не настроена: задайте RESEND_API_KEY и MAIL_FROM")
  return false
}
