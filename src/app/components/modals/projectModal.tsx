import React, { useEffect, useCallback } from 'react';
import InputBox from '../inputBox';
import { useFormStore } from '@/app/store/useFormStore';

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
  due_date: Date | null;
  user_id: string;
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
  const { userData } = useFormStore();
  
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();  
    } 
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleEscapeKey, isOpen]);
  
  if (!isOpen) return null;
  const dropdownOptions = [
    { name: "Lavender", color: "#E6E6FA" },  
    { name: "Mint", color: "#B5EAD7" },      
    { name: "Peach", color: "#FFDAB9" },     
    { name: "Sky", color: "#A0D8EF" },       
    { name: "Lemon", color: "#FFFACD" },     
    { name: "Rose", color: "#FADADD" },      
    { name: "Mauve", color: "#E0B0FF" },     
    { name: "Baby Blue", color: "#BDE0FE" }, 
    { name: "Coral", color: "#FFB5A7" },     
    { name: "Seafoam", color: "#C3FBD8" },   
  ];
  
  return (
    <div
      className={`fixed inset-0 bg-black ${userData?.theme === 'dark' ? 'bg-opacity-60' : 'bg-opacity-40'} flex justify-center items-center z-50`}
      onClick={onClose}
    >
      <div
        className={`modal-popup w-[500px] h-auto rounded-[10px] p-5 shadow-lg flex flex-col gap-5 ${
          userData?.theme === 'dark' 
            ? 'bg-foreground-dark border border-gray-700' 
            : 'bg-white border border-gray-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center">
                <h1 className={`text-[20px] font-bold font-lato ${
                  userData?.theme === 'dark' ? 'text-white' : 'text-text'
                }`}>{isEdit ? "Edit Project" : "Create New Project"}</h1>
                <button className="cursor-pointer" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5 4.50098L4.5 11.501M11.5 11.501L4.5 4.50098L11.5 11.501Z" className={`${
                    userData?.theme === 'dark' ? 'stroke-gray-400' : 'stroke-[#666666]'
                  }`} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
            </div>
            <h2 className={`text-sm font-lato ${
              userData?.theme === 'dark' ? 'text-gray-300' : 'text-[#676767]'
            }`}>{isEdit ? "Edit your project" : "Add a new project to organize your tasks."}</h2>
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
                onChange={(e) => {
                  formik.setFieldValue("color", e.target.value);
                  formik.setFieldValue("colorLabel", e.target.name);
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
                onChange={(e) => formik.setFieldValue("due_date", new Date(e.target.value))} 
                isLabelVisible={true}
                placeholder="Select due date (optional)"
                error={errors.due_date}
            />
        </div>
        <div className="flex flex-row justify-end gap-4 w-full">
            <div className="w-full"></div>
            <div className="flex flex-row gap-[10px]">
                <button className={`border rounded-[5px] flex justify-center items-center font-lato text-xs p-[10px] ${
                  userData?.theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-primary-200 text-primary-default hover:bg-gray-50'
                }`} 
                onClick={onClose}>
                  Cancel
                </button>
                
                <button className={`rounded-[5px] flex justify-center items-center font-lato text-xs p-[10px] ${
                  userData?.theme === 'dark'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:shadow-amber-500/20 text-white'
                    : 'bg-gradient-to-r from-primary-default to-yellow-400 hover:shadow-primary-default/20 text-white'
                }`} 
                onClick={() => submitForm()}>
                  {isEdit ? "Update" : "Create"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
