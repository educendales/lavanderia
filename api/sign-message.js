const crypto = require('crypto');

module.exports = (req, res) => {
  try {
    const toSign = req.query.request || '';
    let privateKey = process.env.QZ_PRIVATE_KEY || '';
    // Por si la llave se pegó con \n literales en vez de saltos de línea reales
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey) {
      res.status(500).send('Falta configurar QZ_PRIVATE_KEY en Vercel');
      return;
    }

    const signer = crypto.createSign('SHA512');
    signer.update(toSign);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(signature);
  } catch (err) {
    res.status(500).send('Error firmando: ' + err.message);
  }
};
