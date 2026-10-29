import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  interviewListQuerySchema,
  interviewScheduleSchema,
  interviewSchema,
  interviewUpdateSchema,
  joinTokenSchema,
} from "@jobify/shared";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";
import { z } from "zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { InterviewsService } from "./interviews.service";

class ScheduleDto extends createZodDto(interviewScheduleSchema) {}
class UpdateDto extends createZodDto(interviewUpdateSchema) {}
class ListQueryDto extends createZodDto(interviewListQuerySchema) {}
class InterviewDto extends createZodDto(interviewSchema) {}
class InterviewListDto extends createZodDto(z.array(interviewSchema)) {}
class JoinTokenDto extends createZodDto(joinTokenSchema) {}

@ApiTags("interviews")
@Controller()
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Roles("EMPLOYER")
  @Post("applications/:applicationId/interviews")
  @ZodSerializerDto(InterviewDto)
  @ApiOkResponse({
    type: InterviewDto,
    description: "Schedules an interview; moves the application to INTERVIEW.",
  })
  schedule(
    @CurrentUser() user: RequestUser,
    @Param("applicationId") applicationId: string,
    @Body() body: ScheduleDto,
  ) {
    return this.interviews.schedule(user.id, applicationId, body);
  }

  @Roles("SEEKER", "EMPLOYER")
  @Get("interviews")
  @ZodSerializerDto(InterviewListDto)
  @ApiOkResponse({
    type: InterviewListDto,
    description: "The caller's interviews (seeker) or their company's (employer).",
  })
  list(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.interviews.list(user, query);
  }

  @Roles("SEEKER", "EMPLOYER")
  @Get("interviews/:id")
  @ZodSerializerDto(InterviewDto)
  @ApiOkResponse({ type: InterviewDto })
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.interviews.get(user, id);
  }

  @Roles("EMPLOYER")
  @Patch("interviews/:id")
  @ZodSerializerDto(InterviewDto)
  @ApiOkResponse({ type: InterviewDto, description: "Reschedule, rename, cancel or complete." })
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: UpdateDto) {
    return this.interviews.update(user.id, id, body);
  }

  @Roles("SEEKER", "EMPLOYER")
  @Post("interviews/:id/join")
  @ZodSerializerDto(JoinTokenDto)
  @ApiOkResponse({ type: JoinTokenDto, description: "LiveKit token for the room while it's open." })
  join(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.interviews.join(user, id);
  }
}
