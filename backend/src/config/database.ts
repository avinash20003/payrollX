import { Pool } from "pg";
import { environment } from "@/config/environment";

export const pool = new Pool({ connectionString: environment.databaseUrl });
