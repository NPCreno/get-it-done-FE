import * as yup from "yup";
import { LIMITS } from "../contracts/common";

export const createTaskSchema = yup.object().shape({
  title: yup
    .string()
    .min(LIMITS.titleMin, "Title must be at least 2 characters long")
    .max(LIMITS.titleMax, `Title must be at most ${LIMITS.titleMax} characters long`)
    .required("Title is required"),

  description: yup
    .string()
    .min(2, "Description must be at least 2 characters long")
    .optional(),

  priority: yup
    .string()
    .required("Priority is required"),

  status: yup
    .string()
    .required("Status is required"),

  isRecurring: yup
    .boolean()
    .required(), // include this field in the schema to base conditions on

  repeat_every: yup
    .string()
    .when("isRecurring", {
      is: true,
      then: (schema) => schema.required("Repeat every is required"),
      otherwise: (schema) => schema.optional(),
    }),

  repeat_days: yup
    .array()
    .of(yup.string().required())
    .when(["isRecurring", "repeat_every"], {
      is: (isRecurring: boolean, repeatEvery: string) =>
        isRecurring && repeatEvery === "Week",
      then: (schema) => schema.min(1, "Please select at least one day").required("Repeat days are required"),
      otherwise: (schema) => schema.optional(),
    }),

  start_date: yup
    .mixed()
    .when("isRecurring", {
      is: true,
      then: () => yup.date().required("Start date is required"),
      otherwise: () => yup.mixed().nullable().optional(),
    }),
});
