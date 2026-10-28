import { Controller, ForbiddenException, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { ApiFoundResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { StorageService } from "../storage/storage.service";
import { parseFileKey } from "./file-keys";
import { FileAccessService } from "./file-access.service";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly access: FileAccessService,
  ) {}

  /** Redirects to a short-lived signed URL after checking the caller may see the file. */
  @Get("*key")
  @ApiFoundResponse({ description: "Redirect to a signed download URL." })
  async download(
    @Param("key") keyParts: string | string[],
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const key = Array.isArray(keyParts) ? keyParts.join("/") : keyParts;
    const parsed = parseFileKey(key);
    if (!parsed) throw new NotFoundException("File not found");
    if (!(await this.access.canRead(user, parsed)))
      throw new ForbiddenException("You can't open this file");

    res.setHeader("Cache-Control", "private, no-store");
    res.redirect(302, await this.storage.signedUrl(key));
  }
}
