import React from 'react';
import InputBox from '../inputBox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/app/components/shadcn/dialog';
import { PROJECT_COLORS } from '@/lib/projectColors';

/** The colour picker's options: the project colour choices (data, not theme; plan 52-2). */
const dropdownOptions = PROJECT_COLORS.map(({ name, color }) => ({ name, color }));

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: FormErrors;
  formik: FormikType;
  submitForm: () => void;
  isEdit: boolean;
}

interface FormValues {
  title: string;
  description: string;
  color: string;
  colorLabel: string;
  due_date: string | null;
}

interface FormErrors {
  title?: string;
  description?: string;
  color?: string;
  colorLabel?: string;
  due_date?: string;
}

interface FormikType {
  values: FormValues;
  errors: FormErrors;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function ProjectModal({ 
  isOpen, 
  onClose, 
  formik,
  errors,
  submitForm,
  isEdit,
}: ProjectModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        overlayClassName="fixed inset-0 bg-th-overlay flex justify-center items-center z-50"
        className="modal-popup w-[500px] h-auto rounded-card p-5 shadow-lg flex flex-col gap-5 bg-th-card border border-th-modal-edge"
      >
        <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center">
                <DialogTitle className="text-[20px] font-card [font-weight:var(--w-card)] text-th-ink">{isEdit ? "Edit Project" : "Create New Project"}</DialogTitle>
                <DialogClose asChild>
                <button type="button" className="cursor-pointer" aria-label="Close">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z" className="stroke-th-ico-x" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                </DialogClose>
            </div>
            <DialogDescription className="text-sm font-ui text-th-ink-note">{isEdit ? "Edit your project" : "Add a new project to organize your tasks."}</DialogDescription>
        </div>

        <InputBox 
            type="text"
            label="Project Title" 
            placeholder="Enter Project title" 
            value={{name: formik.values.title}} 
            onChange={(e) => formik.setFieldValue("title", e.target.value)} 
            isLabelVisible={true}
            error={errors.title}
        />

        <InputBox 
            type="textarea"
            label="Description" 
            placeholder="Enter description (optional)" 
            value={{name: formik.values.description}} 
            onChange={(e) => formik.setFieldValue("description", e.target.value)} 
            isLabelVisible={true}
            error={errors.description}
        />
        
        <div className="flex flex-row gap-5">
            <InputBox 
                type="dropdown"
                label="Color" 
                value={{name: formik.values.colorLabel, color: formik.values.color}} 
                onSelect={(option) => {
                  formik.setFieldValue("color", option.color ?? "");
                  formik.setFieldValue("colorLabel", option.name);
                }} 
                isLabelVisible={true}
                placeholder="Select color"
                dropdownptions={dropdownOptions}
                error={errors.color}
                customClass="translate-x-[150px] translate-y-[-228px]"
            />
            <InputBox 
                type="date"
                label="Due Date" 
                value={{ 
                  name: formik.values.due_date 
                    ? new Date(formik.values.due_date).toISOString().substring(0, 16) 
                    : "" 
                }}
                onChange={(e) => formik.setFieldValue("due_date", e.target.value ? new Date(e.target.value).toISOString() : null)} 
                isLabelVisible={true}
                placeholder="Select due date (optional)"
                error={errors.due_date}
            />
        </div>
        <div className="flex flex-row justify-end gap-4 w-full">
            <div className="w-full"></div>
            <div className="flex flex-row gap-[10px]">
                <button className="border rounded-btn flex justify-center items-center font-ui text-xs p-[10px] border-th-line-acc text-th-btn2-t-alt hover:bg-th-btn2-hover"
                onClick={onClose}>
                  Cancel
                </button>

                <button className="rounded-btn flex justify-center items-center font-ui text-xs p-[10px] bg-gradient-to-r from-th-grad2-start to-th-grad2-end hover:shadow-th-glow text-th-on-acc"
                onClick={() => submitForm()}>
                  {isEdit ? "Update" : "Create"}
                </button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
