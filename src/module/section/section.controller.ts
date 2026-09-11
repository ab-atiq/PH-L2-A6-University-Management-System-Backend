import { crudController } from "../_shared/crud.controller.js";
import { SectionService } from "./section.service.js";
export const SectionController = crudController(SectionService);
