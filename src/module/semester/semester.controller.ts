import { crudController } from "../_shared/crud.controller.js";
import { SemesterService } from "./semester.service.js";
export const SemesterController = crudController(SemesterService);
