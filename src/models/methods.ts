import z from "zod";
import { BaseNode } from "./base";

export type CreateFromJsonResponse<T extends BaseNode> =
| { success: true, node: T, error: undefined } 
| { success: false, node: undefined, error: z.ZodError | Error };
