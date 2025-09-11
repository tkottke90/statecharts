import z from "zod";
import { BaseNode } from "./base";

export interface CreateFromJsonResponse<T extends BaseNode> {
  success: boolean;
  node: T | undefined;
  error: z.ZodError | Error | undefined;
}
