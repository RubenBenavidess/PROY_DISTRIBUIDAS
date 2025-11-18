import express from 'express';
import { getLastHash, signProvidedHash, insertLog } from '../services/logsService.js';

const router = express.Router();

router.get('/last-hash', async (req, res, next) => {
  try {
    const hash = await getLastHash();
    res.json({ hash });
  } catch (err) {
    next(err);
  }
});

router.post('/sign-hash', (req, res, next) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ error: 'hash is required' });
    const signature = signProvidedHash(hash);
    res.json({ signature });
  } catch (err) {
    next(err);
  }
});

// Inserta un nuevo log (actorId, eventType, details)
router.post('/', async (req, res, next) => {
  try {
    const { actorId, eventType, details, previousHash } = req.body;
    if (!actorId || !eventType || !details) return res.status(400).json({ error: 'actorId, eventType and details are required' });
    const result = await insertLog({ actorId, eventType, details, previousHash });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'CHAIN_VALIDATION_FAILED' || err.code === 'PREVIOUS_HASH_MISMATCH') return res.status(409).json({ error: err.message });
    next(err);
  }
});

export default router;
