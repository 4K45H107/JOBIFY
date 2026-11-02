import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { Roles } from "../auth/decorators/roles.decorator";
import { CodingProblemDto, CodingProblemListDto, CodingProblemQueryDto } from "./coding.dto";
import { getProblem, listProblems, listTopics } from "./library";

/** The built-in problem library employers pick coding tests from. */
@ApiTags("coding")
@Controller("coding-problems")
export class CodingController {
  @Roles("EMPLOYER")
  @Get()
  @ZodSerializerDto(CodingProblemListDto)
  @ApiOkResponse({ type: CodingProblemListDto })
  list(@Query() query: CodingProblemQueryDto) {
    return { items: listProblems(query), topics: listTopics() };
  }

  @Roles("EMPLOYER")
  @Get(":slug")
  @ZodSerializerDto(CodingProblemDto)
  @ApiOkResponse({
    type: CodingProblemDto,
    description: "Statement and sample tests. Hidden tests never leave the API.",
  })
  get(@Param("slug") slug: string) {
    const problem = getProblem(slug);
    if (!problem) throw new NotFoundException("Problem not found");
    return problem;
  }
}
