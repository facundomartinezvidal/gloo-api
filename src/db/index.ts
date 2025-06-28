import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Configuración específica para Supabase
export const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client);