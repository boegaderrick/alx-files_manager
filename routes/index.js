import express from 'express';
import 

const router = express.Router();
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
