import dotenv from 'dotenv';
dotenv.config();

import {z} from 'zod';

const check = z.object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGO_URI: z.string(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    CLIENT_URL: z.string().default('http://localhost:5173')
});

let env;

try {
   env = check.parse(process.env);
}
catch(error){
  if(error instanceof z.ZodError){
    console.error("Invalid environment variables:", error.format());
    process.exit(1);
  }
}
export default env;
