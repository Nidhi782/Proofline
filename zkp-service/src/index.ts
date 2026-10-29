import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes/index.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'zkp-service' }));
app.use('/', router);
app.listen(port, '0.0.0.0', () => console.log(`ZKP service listening on ${port}`));
