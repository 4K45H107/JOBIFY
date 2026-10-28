import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UPLOAD_LIMITS } from "@jobify/shared";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import {
  EmployerProfileDto,
  EmployerProfileUpdateDto,
  JobPreferenceDto,
  SeekerProfileDto,
  SeekerProfileUpdateDto,
  SkillSearchQueryDto,
  SkillsUpdateDto,
} from "./profile.dto";
import { ProfileService } from "./profile.service";
import { fileBody, uploadInterceptor, validateUpload } from "../common/upload";

@ApiTags("profile")
@Controller()
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  // ─── seeker ──────────────────────────────────────────────────────────────

  @Roles("SEEKER")
  @Get("me/profile")
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto })
  getSeeker(@CurrentUser() user: RequestUser) {
    return this.profiles.getSeeker(user.id);
  }

  @Roles("SEEKER")
  @Patch("me/profile")
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto })
  updateSeeker(@CurrentUser() user: RequestUser, @Body() body: SeekerProfileUpdateDto) {
    return this.profiles.updateSeeker(user.id, body);
  }

  @Roles("SEEKER")
  @Put("me/skills")
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto })
  setSkills(@CurrentUser() user: RequestUser, @Body() body: SkillsUpdateDto) {
    return this.profiles.setSkills(user.id, body.skills);
  }

  @Roles("SEEKER")
  @Put("me/preferences")
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto })
  setPreferences(@CurrentUser() user: RequestUser, @Body() body: JobPreferenceDto) {
    return this.profiles.setPreferences(user.id, body);
  }

  @Roles("SEEKER")
  @Post("me/cv")
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto, description: "PDF up to 5 MB." })
  uploadCv(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const checked = validateUpload(file, UPLOAD_LIMITS.cv);
    return this.profiles.replaceSeekerFile(user.id, "cv", { buffer: file!.buffer, ...checked });
  }

  @Roles("SEEKER")
  @Delete("me/cv")
  @ZodSerializerDto(SeekerProfileDto)
  @ApiOkResponse({ type: SeekerProfileDto })
  removeCv(@CurrentUser() user: RequestUser) {
    return this.profiles.removeSeekerCv(user.id);
  }

  @Roles("SEEKER", "EMPLOYER")
  @Post("me/photo")
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  @ApiOkResponse({ description: "PNG, JPEG or WebP up to 2 MB. Returns the updated profile." })
  uploadPhoto(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const checked = validateUpload(file, UPLOAD_LIMITS.image);
    const upload = { buffer: file!.buffer, ...checked };
    return user.role === "SEEKER"
      ? this.profiles.replaceSeekerFile(user.id, "photo", upload)
      : this.profiles.replaceEmployerPhoto(user.id, upload);
  }

  @Get("skills")
  @ApiOkResponse({ description: "Up to 20 skill names matching ?q=." })
  searchSkills(@Query() query: SkillSearchQueryDto) {
    return this.profiles.searchSkills(query.q);
  }

  // ─── employer ────────────────────────────────────────────────────────────

  @Roles("EMPLOYER")
  @Get("me/employer-profile")
  @ZodSerializerDto(EmployerProfileDto)
  @ApiOkResponse({ type: EmployerProfileDto })
  getEmployer(@CurrentUser() user: RequestUser) {
    return this.profiles.getEmployer(user.id);
  }

  @Roles("EMPLOYER")
  @Patch("me/employer-profile")
  @ZodSerializerDto(EmployerProfileDto)
  @ApiOkResponse({ type: EmployerProfileDto })
  updateEmployer(@CurrentUser() user: RequestUser, @Body() body: EmployerProfileUpdateDto) {
    return this.profiles.updateEmployer(user.id, body);
  }
}
