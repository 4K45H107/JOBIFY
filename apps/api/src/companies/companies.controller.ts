import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UPLOAD_LIMITS } from "@jobify/shared";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { fileBody, uploadInterceptor, validateUpload } from "../common/upload";
import {
  BranchCreateDto,
  BranchDto,
  CompanyCreateDto,
  CompanyDetailDto,
  CompanyListDto,
  CompanyListQueryDto,
  CompanyMemberListDto,
  CompanyUpdateDto,
  MemberListQueryDto,
} from "./companies.dto";
import { CompaniesService } from "./companies.service";

@ApiTags("companies")
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @ZodSerializerDto(CompanyListDto)
  @ApiOkResponse({ type: CompanyListDto })
  list(@Query() query: CompanyListQueryDto) {
    return this.companies.list(query);
  }

  // Routes under /mine are declared before /:slug so "mine" isn't read as a slug.

  @Roles("EMPLOYER")
  @Get("mine")
  @ZodSerializerDto(CompanyDetailDto)
  @ApiOkResponse({ type: CompanyDetailDto })
  mine(@CurrentUser() user: RequestUser) {
    return this.companies.getMine(user.id);
  }

  @Roles("EMPLOYER")
  @Patch("mine")
  @ZodSerializerDto(CompanyDetailDto)
  @ApiOkResponse({ type: CompanyDetailDto })
  update(@CurrentUser() user: RequestUser, @Body() body: CompanyUpdateDto) {
    return this.companies.update(user.id, body);
  }

  @Roles("EMPLOYER")
  @Post("mine/logo")
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  @ZodSerializerDto(CompanyDetailDto)
  uploadLogo(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const checked = validateUpload(file, UPLOAD_LIMITS.image);
    return this.companies.replaceImage(user.id, "logo", { buffer: file!.buffer, ...checked });
  }

  @Roles("EMPLOYER")
  @Post("mine/cover")
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody(fileBody)
  @ZodSerializerDto(CompanyDetailDto)
  uploadCover(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const checked = validateUpload(file, UPLOAD_LIMITS.image);
    return this.companies.replaceImage(user.id, "cover", { buffer: file!.buffer, ...checked });
  }

  @Roles("EMPLOYER")
  @Get("mine/members")
  @ZodSerializerDto(CompanyMemberListDto)
  @ApiOkResponse({ type: CompanyMemberListDto })
  members(@CurrentUser() user: RequestUser, @Query() query: MemberListQueryDto) {
    return this.companies.members(user.id, query.status);
  }

  @Roles("EMPLOYER")
  @Post("mine/members/:userId/approve")
  @HttpCode(204)
  @ApiNoContentResponse()
  approve(@CurrentUser() user: RequestUser, @Param("userId") memberId: string) {
    return this.companies.decide(user.id, memberId, "ACTIVE");
  }

  @Roles("EMPLOYER")
  @Post("mine/members/:userId/reject")
  @HttpCode(204)
  @ApiNoContentResponse()
  reject(@CurrentUser() user: RequestUser, @Param("userId") memberId: string) {
    return this.companies.decide(user.id, memberId, "REJECTED");
  }

  @Roles("EMPLOYER")
  @Post("mine/branches")
  @ZodSerializerDto(BranchDto)
  @ApiOkResponse({ type: BranchDto })
  addBranch(@CurrentUser() user: RequestUser, @Body() body: BranchCreateDto) {
    return this.companies.addBranch(user.id, body);
  }

  @Roles("EMPLOYER")
  @Delete("mine/branches/:branchId")
  @HttpCode(204)
  @ApiNoContentResponse()
  removeBranch(@CurrentUser() user: RequestUser, @Param("branchId") branchId: string) {
    return this.companies.removeBranch(user.id, branchId);
  }

  @Roles("EMPLOYER")
  @Delete("join-requests/mine")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Withdraws the caller's pending join request." })
  cancelRequest(@CurrentUser() user: RequestUser) {
    return this.companies.cancelRequest(user.id);
  }

  @Roles("EMPLOYER")
  @Post()
  @ZodSerializerDto(CompanyDetailDto)
  @ApiOkResponse({
    type: CompanyDetailDto,
    description: "Creates the company with the caller as admin.",
  })
  create(@CurrentUser() user: RequestUser, @Body() body: CompanyCreateDto) {
    return this.companies.create(user.id, body);
  }

  @Roles("EMPLOYER")
  @Post(":id/join-requests")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Asks to join; the company admins are notified." })
  requestToJoin(@CurrentUser() user: RequestUser, @Param("id") companyId: string) {
    return this.companies.requestToJoin(user.id, companyId);
  }

  @Get(":slug")
  @ZodSerializerDto(CompanyDetailDto)
  @ApiOkResponse({ type: CompanyDetailDto })
  bySlug(@Param("slug") slug: string) {
    return this.companies.getBySlug(slug);
  }
}
