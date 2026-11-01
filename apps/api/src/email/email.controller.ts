import { Body, Controller, Get, HttpCode, Post, Put, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  emailPreferencesSchema,
  emailPreferenceUpdateSchema,
  unsubscribeResultSchema,
} from "@jobify/shared";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { EmailService } from "./email.service";

class PreferencesDto extends createZodDto(emailPreferencesSchema) {}
class PreferenceUpdateDto extends createZodDto(emailPreferenceUpdateSchema) {}
class UnsubscribeResultDto extends createZodDto(unsubscribeResultSchema) {}

@ApiTags("email")
@Controller()
export class EmailController {
  constructor(private readonly email: EmailService) {}

  @Get("me/email-preferences")
  @ZodSerializerDto(PreferencesDto)
  @ApiOkResponse({ type: PreferencesDto })
  preferences(@CurrentUser() user: RequestUser) {
    return this.email.preferences(user.id, user.role);
  }

  @Put("me/email-preferences")
  @ZodSerializerDto(PreferencesDto)
  @ApiOkResponse({ type: PreferencesDto })
  update(@CurrentUser() user: RequestUser, @Body() body: PreferenceUpdateDto) {
    return this.email.update(user.id, user.role, body);
  }

  /**
   * Public: the token is the proof. Takes it from the query string too, for mail apps'
   * one-click unsubscribe (RFC 8058), which POST to the List-Unsubscribe URL with no body.
   */
  @Public()
  @Post("email/unsubscribe")
  @HttpCode(200)
  @ZodSerializerDto(UnsubscribeResultDto)
  @ApiOkResponse({ type: UnsubscribeResultDto })
  unsubscribe(@Body("token") bodyToken?: unknown, @Query("token") queryToken?: unknown) {
    // Plain fields, not a DTO: the one-click POST has no body at all.
    return this.email.unsubscribe(bodyToken ?? queryToken);
  }
}
