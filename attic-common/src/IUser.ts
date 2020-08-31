export default interface IUser {
    id?: any;
    _id?: any;
    type: string;
    authenticateUser(...args: any[]): Promise<boolean>;
    expiresAt?: Date;
    disabled?: boolean;
    username: string;
}