import { z } from "zod";

export const adminLoginSchema = z.object({
    username: z.string(),
    password: z.string()
}).strict();

