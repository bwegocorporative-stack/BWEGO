
async function enviarSMS({ telefone }) {
  if (!telefone) {
    throw new Error('O telefone é obrigatório.');
  }

  const numero = telefone.replace(/\s/g, '');

  if (!/^\+2449\d{8}$/.test(numero)) {
    throw new Error('Telefone inválido. Utiliza +244XXXXXXXXX.');
  }

  const response = await fetch(
    'https://api.kambasms.ao/otp/send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.KAMBA_API_KEY,
      },
      body: JSON.stringify({
        phone: numero,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Não foi possível enviar o SMS.'
    );
  }

  return {
    enviado: true,
    otpId: data.otp_id,
    validade: data.expires_in,
  };
}

module.exports = { enviarSMS };
