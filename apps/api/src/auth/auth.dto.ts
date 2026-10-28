import { authUserSchema, loginSchema, registerSchema } from "@jobify/shared";
import { createZodDto } from "nestjs-zod";

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class AuthUserDto extends createZodDto(authUserSchema) {}
