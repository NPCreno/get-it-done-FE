import React, { useEffect, useRef, useState } from "react";
import InputBox from "../inputBox";
import { IProject } from "@/app/interface/IProject";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/shadcn/dialog";
import { assigneeAfterProjectChange } from "@/app/components/tasks/assignee";

/** FEAT-09: a project someone shared with me, listed under "Shared with me". */
export interface SharedProjectOption {
  project_id: string;
  title: string;
  color: string;
  owner_username: string;
}

interface taskModalProps {
  onClose: () => void;
  formik: FormikType;
  handleCreateTask: (values: FormValues) => void;
  project: IProject[];
  /** FEAT-09: shared projects, shown as a second group in the project picker. */
  sharedProjects?: SharedProjectOption[];
  /** FEAT-09: the Assignee field (it loads the project's members itself). */
  assigneeField?: React.ReactNode;
  preselectedProject?: IProject | null;
  isUpdate?: boolean;
  handleUpdateTask: (values: FormValues) => void;
  isLoading?: boolean;
}

interface FormValues {
  title: string;
  description: string;
  priority: string;
  project: string;
  project_id: string;
  project_title: string;
  project_color: string;
  status: string;
  due_date: string | null;
  isRecurring: boolean;
  repeat_every: string;
  repeat_days: string[];
  start_date: string | null;
  end_date: string | null;
  assignee_id?: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
  project?: string;
  project_id?: string;
  project_title?: string;
  project_color?: string;
  status?: string;
  due_date?: string;
  isRecurring?: string;
  repeat_every?: string;
  repeat_days?: string[] | string;
  start_date?: string;
  end_date?: string;
}

interface FormikType {
  values: FormValues;
  errors: FormErrors;
  setFieldValue: (
    field: keyof FormValues,
    value: FormValues[keyof FormValues]
  ) => void;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  setFieldError: (field: keyof FormErrors, message: string) => void;
}


export default function TaskModal({
  onClose,
  formik,
  handleCreateTask,
  handleUpdateTask,
  project,
  sharedProjects = [],
  assigneeField,
  preselectedProject,
  isUpdate,
  isLoading,
}: taskModalProps) {
  const [height, setHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const priorityOptions = [
    // Option dots are theme tokens (Classic: today's palette colours).
    { name: "Low", color: "var(--dot-low)" },
    { name: "Medium", color: "var(--dot-med)" },
    { name: "High", color: "var(--dot-high)" },
  ];

  const statusOptions = [
    { name: "Pending", color: "var(--dot-low)" },
    { name: "Complete", color: "var(--dot-done)" },
  ];

  const repeatEveryOptions = [
    { name: "Day" },
    { name: "Week" },
    { name: "Month" },
  ];

  const projectOptions = [
    ...project.map((option: IProject) => ({
      name: option.title,
      project_id: option.project_id,
      color: option.color,
    })),
    // Names must be unique in the picker, so a shared project carries its owner.
    ...sharedProjects.map((option) => ({
      name: `${option.title || "Untitled project"} (@${option.owner_username})`,
      project_id: option.project_id,
      color: option.color,
      group: "Shared with me",
    })),
  ];

  const clearAllData = () => {
    formik.setFieldValue("title", "");
    formik.setFieldValue("description", "");
    formik.setFieldValue("priority", "");
    formik.setFieldValue("project", "");
    formik.setFieldValue("status", "");
    formik.setFieldValue("due_date", null);
    formik.setFieldValue("isRecurring", false);
    formik.setFieldValue("repeat_every", "");
    formik.setFieldValue("repeat_days", []);
    formik.setFieldValue("start_date", null);
    formik.setFieldValue("end_date", null);
    formik.setFieldError("title", "");
    formik.setFieldError("description", "");
    formik.setFieldError("priority", "");
    formik.setFieldError("project", "");
    formik.setFieldError("status", "");
    formik.setFieldError("due_date", "");
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (ref.current) {
        setHeight(ref.current.scrollHeight + 40);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [formik.values.isRecurring, formik.errors]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          clearAllData();
          onClose();
        }
      }}
    >
      <DialogContent
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
        className={`modal-popup bg-th-card [border-width:var(--edge-w)] border-th-edge w-[550px] rounded-[10px] p-5 shadow-lg overflow-hidden transition-all duration-200 ease-in-out`}
        style={{ height }}
      >
        <div ref={ref} className="h-auto flex flex-col gap-5 ">
          <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center">
              <DialogTitle className="text-th-ink text-[20px] font-bold font-lato">
                {isUpdate ? "Task" : "Add New Task"}
              </DialogTitle>
              <DialogClose asChild>
              <button
                type="button"
                className="cursor-pointer"
                aria-label="Close"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z"
                    className="stroke-th-ico-close"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              </DialogClose>
            </div>
            <DialogDescription className="text-th-dlg-note text-sm font-lato">
              {isUpdate
                ? "View or update task"
                : "Create a new task to track your work"}
            </DialogDescription>
          </div>

          <InputBox
            type="text"
            label="Task Title"
            placeholder="Enter Task title"
            value={{ name: formik.values.title }}
            onChange={(e) => formik.setFieldValue("title", e.target.value)}
            isLabelVisible={true}
            error={formik.errors.title}
            customClass="fade-in-delay-1"
            labelCustomClass="fade-in-delay-1"
          />

          <InputBox
            type="textarea"
            label="Description"
            placeholder="Enter description (optional)"
            value={{ name: formik.values.description }}
            onChange={(e) =>
              formik.setFieldValue("description", e.target.value)
            }
            isLabelVisible={true}
            error={formik.errors.description}
            customClass="fade-in-delay-2"
            labelCustomClass="fade-in-delay-2"
          />

          <div className="flex flex-row gap-5 fade-in-delay-2">
            <InputBox
              type="dropdown"
              label="Priority"
              value={{ name: formik.values.priority }}
              onSelect={(option) => {
                formik.setFieldValue("priority", option.name);
              }}
              isLabelVisible={true}
              placeholder="Select priority"
              dropdownptions={priorityOptions}
              error={formik.errors.priority}
              labelCustomClass="fade-in-delay-2"
            />
            <InputBox
              type="dropdown"
              label="Project"
              value={{
                name: preselectedProject
                  ? preselectedProject.title
                  : formik.values.project_title,
                color: preselectedProject
                  ? preselectedProject.color
                  : formik.values.project_color,
                project_id: preselectedProject
                  ? preselectedProject.project_id
                  : formik.values.project_id,
              }}
              onSelect={(option) => {
                formik.setFieldValue("project_title", option.name);
                formik.setFieldValue("project_color", option.color ?? "");
                formik.setFieldValue("project_id", option.project_id ?? "");
                // FEAT-09: a new project has different people, so the assignee starts over.
                formik.setFieldValue(
                  "assignee_id",
                  assigneeAfterProjectChange(formik.values.project_id, option.project_id ?? "", formik.values.assignee_id ?? "")
                );
              }}
              isLabelVisible={true}
              placeholder="Select project (optional)"
              dropdownptions={projectOptions}
              error={formik.errors.project}
              labelCustomClass="fade-in-delay-3"
              disabled={preselectedProject ? true : false}
            />
          </div>

          {assigneeField && <div className="fade-in-delay-3">{assigneeField}</div>}

          <div className="flex flex-row gap-5 fade-in-delay-3">
            <InputBox
              type="dropdown"
              label="Status"
              value={{ name: formik.values.status }}
              onSelect={(option) => {
                formik.setFieldValue("status", option.name);
              }}
              isLabelVisible={true}
              placeholder="Select status"
              dropdownptions={statusOptions}
              error={formik.errors.status}
            />
            <InputBox
              type="datewithtime"
              label="Due Date"
              value={{
                name: formik.values.due_date
                  ? formik.values.due_date.toString()
                  : "",
              }}
              onChange={(e) =>
                formik.setFieldValue(
                  "due_date",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
              isLabelVisible={true}
              placeholder="Select due date (optional)"
              error={formik.errors.due_date}
              customClass="translate-x-[-230px] translate-y-[-400px]"
            />
          </div>

          {!isUpdate && (
            <>
              <div className="flex flex-row w-full justify-center">
                <button
                  className={`flex justify-center items-center font-lato font-bold text-[13px] p-[10px] ${
                          formik.values.isRecurring ? "bg-th-acc text-th-on-acc rounded-sm" : "text-th-acc-t"
                        }`}
                  onClick={() =>
                    formik.setFieldValue(
                      "isRecurring",
                      !formik.values.isRecurring
                    )
                  }
                >
                  Recurring
                </button>
              </div>

              {formik.values.isRecurring && (
                <>
                  <div className="fade-in">
                    <div className="flex flex-row gap-5 fade-in-delay-1">
                      <InputBox
                        type="dropdown"
                        label="Repeat Every"
                        value={{ name: formik.values.repeat_every }}
                        onSelect={(option) => {
                          formik.setFieldValue("repeat_every", option.name);
                        }}
                        isLabelVisible={true}
                        placeholder="Select repeat every"
                        dropdownptions={repeatEveryOptions}
                        error={formik.errors.repeat_every}
                      />
                      <InputBox
                        type="weekdayselector"
                        label="Repeat Days"
                        value={{ name: formik.values.repeat_days.join(",") }}
                        onChange={(e) =>
                          formik.setFieldValue(
                            "repeat_days",
                            e.target.name ? e.target.name.split(",").filter(Boolean) : []
                          )
                        }
                        isLabelVisible={true}
                        placeholder="Select repeat days"
                        error={
                          Array.isArray(formik.errors.repeat_days)
                            ? formik.errors.repeat_days.join(", ")
                            : formik.errors.repeat_days
                        }
                        disabled={formik.values.repeat_every !== "Week"}
                      />
                    </div>

                    <div className="flex flex-row gap-5 fade-in-delay-2">
                      <InputBox
                        type="date"
                        label="Start Date"
                        value={{
                          name: formik.values.start_date
                            ? formik.values.start_date.toString()
                            : "",
                        }}
                        onChange={(e) => {
                          formik.setFieldValue(
                            "start_date",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null
                          );
                        }}
                        isLabelVisible={true}
                        placeholder="Select start date"
                        error={formik.errors.start_date}
                      />
                      <InputBox
                        type="date"
                        label="End Date"
                        value={{
                          name: formik.values.end_date
                            ? formik.values.end_date.toString()
                            : "",
                        }}
                        onChange={(e) =>
                          formik.setFieldValue(
                            "end_date",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null
                          )
                        }
                        isLabelVisible={true}
                        placeholder="Select end date (optional)"
                        error={formik.errors.end_date}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex flex-row justify-end gap-4 w-full">
            <div className="w-full"></div>
            <div className="flex flex-row gap-[10px]">
              <DialogClose asChild>
              <button
                type="button"
                className="border border-th-acc-soft rounded-[5px] flex justify-center items-center text-th-acc-t 
                font-lato text-[13px] font-bold p-[10px]"
              >
                Cancel
              </button>
              </DialogClose>
              <button
                disabled={isLoading}
                className="bg-th-acc rounded-[5px] w-[60px] flex justify-center items-center text-th-on-acc font-lato 
                text-[13px] font-bold p-[10px]"
                type="button"
                onClick={() =>
                  isUpdate
                    ? handleUpdateTask(formik.values)
                    : handleCreateTask(formik.values)
                }
              >
                {isLoading ? <div className="loader"></div> : (isUpdate ? "Update" : "Create")}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
