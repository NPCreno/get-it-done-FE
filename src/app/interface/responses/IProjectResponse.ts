import { IProject } from "../IProject";

export interface IProjectResponse{
    status: string;
    message: string;
    data?: IProject;
    error?: string;
}