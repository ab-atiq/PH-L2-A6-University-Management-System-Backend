import { crudController } from "../_shared/crud.controller.js";
import { CourseService } from "./course.service.js";
export const CourseController = crudController(CourseService);
