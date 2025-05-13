import { SignupData as GlobalSignupData } from '../../types';

export interface StepProps {
    data: {
        profilePics?: (string | null)[];
        businessCard?: string | null;
        [key: string]: any;
    };
    setData: (field: keyof GlobalSignupData, value: any) => void;
    userSpecificStorageUuid: string;
} 