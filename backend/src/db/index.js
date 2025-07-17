import pkg from 'pg';
import { POSTGRES_CONFIG } from '../config.js';
const { Pool } = pkg;

const pool = new Pool(POSTGRES_CONFIG);

export default pool; 