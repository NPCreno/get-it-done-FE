"use client";
import { useFormik } from "formik";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useFormState } from "@/app/context/FormProvider";
import { toCreateProjectRequest, toUpdateProjectRequest } from "@/app/contracts/mappers";
import type { ProjectFormValues } from "@/app/contracts/forms";
import { projectSchema } from "@/app/schemas/projectSchema";
import type { TaskEditor } from "@/app/components/tasks/useTaskEditor";
import type { ToastController } from "@/hooks/toastController";
import { isUserFacing } from "@/lib/apiClient";
import { focusFallback } from "@/lib/focusFallback";
import { useCreateProject, useDeleteProject, useUpdateProject } from "@/lib/query/mutations";
import { useProject } from "@/lib/query/queries";
import { failureOf, settled } from "@/lib/query/unwrap";
import { EMPTY_PROJECT_FORM, projectFormValuesOf, shouldPrefill } from "./projectPrefill";

interface ProjectSession {
  open: boolean;
  /** The project being edited; undefined when creating or closed. */
  projectId: string | undefined;
  /** Counts sessions, so a prefill belongs to exactly one of them. */
  id: number;
}

/**
 * The project form (project fields only; the task editor has its own form). `open(projectId?)`
 * starts a session (edit when an id is given), `close()` ends it and clears the form. The toast
 * controller is the page's own instance; `taskEditor` and `headingRef` are used by `remove`.
 */
export function useProjectEditor(
  toast: ToastController,
  taskEditor: Pick<TaskEditor, "close">,
  headingRef: RefObject<HTMLElement | null>
) {
  const { userData } = useFormState();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const [session, setSession] = useState<ProjectSession>({ open: false, projectId: undefined, id: 0 });
  const isEdit = !!session.projectId;

  const { values, errors, handleChange, setFieldValue, submitForm, resetForm, dirty } = useFormik<ProjectFormValues>({
    initialValues: EMPTY_PROJECT_FORM,
    validationSchema: projectSchema,
    validateOnChange: false, // Disable real-time validation
    validateOnBlur: false,
    // Formik validates first and calls this only when the form is valid.
    onSubmit: async (values) => {
      if (!userData) return;
      if (isEdit) await updateProj(values);
      else await createProj(values);
    },
  });

  const open = (projectId?: string) => {
    resetForm({ values: EMPTY_PROJECT_FORM });
    setSession((s) => ({ open: true, projectId, id: s.id + 1 }));
  };

  const close = () => {
    resetForm({ values: EMPTY_PROJECT_FORM }); // values, errors and touched
    setSession((s) => ({ open: false, projectId: undefined, id: s.id + 1 }));
  };

  async function createProj(values: ProjectFormValues) {
    try {
      const response = await settled(createProjectMutation.mutateAsync(toCreateProjectRequest(values)));
      if (response.ok) {
        close();
        toast.success("Project Created", "Your new project has been created successfully");
      } else if (isUserFacing(response.failure)) {
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    }
  }

  async function updateProj(values: ProjectFormValues) {
    try {
      const projectId = session.projectId;
      if (!projectId) {
        console.error("No project id to update");
        return;
      }
      const response = await settled(
        updateProjectMutation.mutateAsync({ projectId, body: toUpdateProjectRequest(values) })
      );
      if (response.ok) {
        close();
        toast.success("Project Updated", "Your project has been updated successfully");
      } else if (isUserFacing(response.failure)) {
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    }
  }

  // The form is filled from the project query once per session, when the edited project's data
  // first arrives. A refetch never overwrites it, and nothing is filled while creating or closed,
  // so the task form can't pick up project values (#55).
  const projectQuery = useProject(session.projectId);
  const loadedProject = projectQuery.data;
  const prefilledSession = useRef<number | null>(null);
  useEffect(() => {
    if (!loadedProject) return;
    const prefill = shouldPrefill({
      loadedId: loadedProject.project_id,
      editingId: session.projectId,
      sessionPrefilled: prefilledSession.current === session.id,
      dirty,
    });
    if (!prefill) return;
    prefilledSession.current = session.id;
    resetForm({ values: projectFormValuesOf(loadedProject) });
  }, [loadedProject, session, dirty, resetForm]);

  const projectLoadFailure = projectQuery.isError ? failureOf(projectQuery.error) : null;
  useEffect(() => {
    if (projectLoadFailure && isUserFacing(projectLoadFailure)) {
      toast.error("Could not load project details", projectLoadFailure.message);
    }
  }, [projectLoadFailure, toast]);

  const remove = async (projectId: string) => {
    try {
      const response = await settled(deleteProjectMutation.mutateAsync(projectId));
      if (response.ok) {
        resetForm({ values: EMPTY_PROJECT_FORM });
        taskEditor.close();
        focusFallback(headingRef);
        toast.success("Project Deleted", "Your project has been deleted.");
      } else if (isUserFacing(response.failure)) {
        if (response.failure.kind === "api") {
          resetForm({ values: EMPTY_PROJECT_FORM });
          taskEditor.close();
        }
        toast.failure(response.failure);
      }
    } catch (error) {
      toast.unexpected(error);
    }
  };

  return {
    isOpen: session.open,
    isEdit,
    formik: { values, errors, handleChange, setFieldValue },
    open,
    close,
    submit: () => void submitForm(),
    remove,
  };
}

export type ProjectEditor = ReturnType<typeof useProjectEditor>;
