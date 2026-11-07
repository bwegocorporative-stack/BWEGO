
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 465),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function enviarEmail({ destinatario, assunto, mensagem }) {
  if (!destinatario || !assunto || !mensagem) {
    throw new Error('Destinatário, assunto e mensagem são obrigatórios.');
  }

  const resultado = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: destinatario,
    subject: assunto,
    text: mensagem,
  });

  return {
    messageId: resultado.messageId,
    enviado: true,
  };
}

module.exports = { enviarEmail };
