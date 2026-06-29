// Endpoint de diagnóstico - bórralo después de resolver el problema
module.exports = function handler(req, res) {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const groqPrefix = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0, 8) + '...' : 'NO ENCONTRADA';
  res.status(200).json({
    ok: true,
    groq_key_present: hasGroq,
    groq_key_prefix: groqPrefix,
    node_version: process.version,
    env: process.env.NODE_ENV || 'unknown'
  });
};
