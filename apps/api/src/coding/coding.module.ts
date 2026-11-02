import { Module } from "@nestjs/common";
import { CodingController } from "./coding.controller";

@Module({ controllers: [CodingController] })
export class CodingModule {}
