import * as yup from "yup";

export const createSubTaskSchema = yup.object().shape({
  title: yup
    .string()
    .min(2, "Subtask title must be at least 2 characters long")
    .required("Subtask title is required"),
});
