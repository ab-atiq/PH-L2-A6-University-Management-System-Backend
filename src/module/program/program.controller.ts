import { crudController } from "../_shared/crud.controller.js";
import { ProgramService } from "./program.service.js";
export const ProgramController = crudController(ProgramService);
