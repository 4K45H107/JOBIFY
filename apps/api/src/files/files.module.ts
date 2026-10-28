import { Module } from "@nestjs/common";
import { FileAccessService } from "./file-access.service";
import { FilesController } from "./files.controller";

@Module({ controllers: [FilesController], providers: [FileAccessService] })
export class FilesModule {}
