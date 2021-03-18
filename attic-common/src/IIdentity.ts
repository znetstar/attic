export interface IIdentity {
    provider: string;
    id: string;
    _id: string|any;
    displayName?: string;
    name: {
        familyName: string,
        givenName: string,
        middleName?: string
    },
    emails?: { value: string, type?: string }[]
    photos?: { value: string }[]
}

export default IIdentity;