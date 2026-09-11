import { crudController } from "../_shared/crud.controller.js";
import { DepartmentService } from "./department.service.js";
export const DepartmentController = crudController(DepartmentService);
