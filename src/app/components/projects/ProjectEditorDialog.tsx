"use client";
import ProjectModal from "@/app/components/modals/projectModal";
import type { ProjectEditor } from "./useProjectEditor";

/** Renders the existing ProjectModal with the editor's bindings; the modal itself is unchanged. */
export default function ProjectEditorDialog({ editor }: { editor: ProjectEditor }) {
  if (!editor.isOpen) return null;
  return (
    <ProjectModal
      errors={editor.formik.errors}
      isOpen={editor.isOpen}
      onClose={editor.close}
      formik={editor.formik}
      submitForm={editor.submit}
      isEdit={editor.isEdit}
    />
  );
}
