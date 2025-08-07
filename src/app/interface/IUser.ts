export interface IUser {
    user_id: string;
    fullname: string;
    username: string;
    email: string;
    tier: string;
    enableNotifications?: string;
    theme?: string;
    soundFx?: string;
}