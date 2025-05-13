import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SignupModalBase from './SignupModalBase';
import Step1Email from './Steps/Step1Email';
import Step2Gender from './Steps/Step2Gender';
import Step3Password from './Steps/Step3Password';
import Step4Nickname from './Steps/Step4Nickname';
import Step5DOB from './Steps/Step5DOB';
import Step6Height from './Steps/Step6Height';
import Step7City from './Steps/Step7City';
import Step8ProfilePics from './Steps/Step8ProfilePics';
import Step9BusinessCard from './Steps/Step9BusinessCard';
import { SignupData } from '../../types'; // Import from common types file
// import Step2Gender from './Steps/Step2Gender';
// ... import other step components later

// Type for initial social data passed from App.tsx
interface InitialSocialData {
  provider: 'google' | 'kakao';
  socialEmail: string;
}

interface SignupFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: SignupData) => void;
    initialSocialData?: InitialSocialData | null; // Add optional prop
}

// Maximum possible steps
const MAX_STEPS = 9;

const SignupFlow: React.FC<SignupFlowProps> = ({ isOpen, onClose, onComplete, initialSocialData }) => {
    // Determine initial state based on props
    const getInitialState = (): SignupData => ({
        email: initialSocialData?.socialEmail || '', // Pre-fill email if social signup
        gender: '',
        password: '', // Password not needed for social, but keep field for type consistency
        passwordConfirm: '',
        nickname: '',
        dob: '',
        height: '',
        city: '',
        profilePics: [null, null, null],
        businessCard: null,
        // Store provider info internally if needed, though App.tsx handles the final API call choice
        // provider: initialSocialData?.provider || 'local', 
    });

    // Determine initial step
    // If social data is present, skip email (step 1) and password (step 3)
    // Start from Gender (step 2) for both normal and social signup
    const initialStep = initialSocialData ? 2 : 1;

    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const [signupData, setSignupData] = useState<SignupData>(getInitialState());
    const [userSpecificStorageUuid, setUserSpecificStorageUuid] = useState<string>('');

    // Reset state when the modal is opened/closed or initial data changes
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(initialSocialData ? 2 : 1);
            setSignupData(getInitialState());
            setUserSpecificStorageUuid(uuidv4());
        } else {
             // Optional: Reset when closed? Depends on desired behavior.
             // setCurrentStep(1);
             // setSignupData(getInitialState()); // Needs careful handling if initialSocialData disappears
             setUserSpecificStorageUuid('');
        }
        // Add initialSocialData to dependency array if its change should trigger reset
    }, [isOpen, initialSocialData]);

    const updateSignupData = useCallback((field: keyof SignupData, value: any) => {
        setSignupData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Adjust final step based on gender (remains the same)
    const finalStep = signupData.gender === 'male' ? MAX_STEPS : MAX_STEPS - 1;

    const handleNext = () => {
        // Skip step 9 if gender is not male
        if (currentStep === MAX_STEPS - 1 && signupData.gender !== 'male') {
            onComplete(signupData);
            return;
        }

        if (currentStep < finalStep) {
            // Special handling for skipping password step if social signup
            if (currentStep === 2 && initialSocialData) {
                 setCurrentStep(4); // Jump from Gender (2) to Nickname (4)
            } else {
                 setCurrentStep(prev => prev + 1);
            }
        } else {
            onComplete(signupData);
        }
    };

    const handleBack = () => {
        // Skip step 9 if gender is not male when going back from the (non-existent) step 10
        if (currentStep === MAX_STEPS && signupData.gender !== 'male') {
            setCurrentStep(MAX_STEPS - 1);
            return;
        }

        if (currentStep > 1) {
            // Special handling for skipping password step if social signup
             if (currentStep === 4 && initialSocialData) {
                 setCurrentStep(2); // Jump back from Nickname (4) to Gender (2)
             } else {
                 setCurrentStep(prev => prev - 1);
             }
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return !initialSocialData ? <Step1Email data={signupData} setData={updateSignupData} /> : null; // Don't render step 1 for social
            case 2: return <Step2Gender data={signupData} setData={updateSignupData} />;
            case 3: return !initialSocialData ? <Step3Password data={signupData} setData={updateSignupData} /> : null; // Don't render step 3 for social
            case 4: return <Step4Nickname data={signupData} setData={updateSignupData} />;
            case 5: return <Step5DOB data={signupData} setData={updateSignupData} />;
            case 6: return <Step6Height data={signupData} setData={updateSignupData} />;
            case 7: return <Step7City data={signupData} setData={updateSignupData} />;
            case 8: return <Step8ProfilePics data={signupData} setData={updateSignupData} userSpecificStorageUuid={userSpecificStorageUuid} />;
            case 9: return signupData.gender === 'male' ? <Step9BusinessCard data={signupData} setData={updateSignupData} userSpecificStorageUuid={userSpecificStorageUuid} /> : <div>Invalid Step</div>; // Should not happen if logic is correct
            default: return <div>Step {currentStep} (Not Implemented)</div>;
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 1: return !initialSocialData ? 'Enter your Email' : '';
            case 2: return 'Select your Gender';
            case 3: return !initialSocialData ? 'Create your Password' : '';
            case 4: return 'Choose your Nickname';
            case 5: return 'Enter your Date of Birth';
            case 6: return 'Enter your Height (cm)';
            case 7: return 'Enter your City';
            case 8: return 'Upload Your Photos';
            case 9: return signupData.gender === 'male' ? 'Upload Business Card' : 'Final Step'; // Adjust title if step 9 is skipped
            default: return `Step ${currentStep}`;
        }
    };

    // Update validation logic based on current step and flow type
    const isNextDisabled = (): boolean => {
        if (initialSocialData) {
             // Validation for social signup steps (skip email/password checks)
             switch (currentStep) {
                 case 2: return !signupData.gender;
                 case 4: return !signupData.nickname;
                 case 5: return !signupData.dob;
                 case 6: return !signupData.height;
                 case 7: return !signupData.city;
                 case 8: return signupData.profilePics.filter(p => p !== null).length < 3;
                 case 9: return signupData.gender === 'male' && !signupData.businessCard;
                 default: return true;
             }
        } else {
             // Original validation for normal signup
             switch (currentStep) {
                case 1: return !signupData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email);
                case 2: return !signupData.gender;
                case 3: return !signupData.password || signupData.password !== signupData.passwordConfirm;
                case 4: return !signupData.nickname;
                case 5: return !signupData.dob;
                case 6: return !signupData.height;
                case 7: return !signupData.city;
                case 8: return signupData.profilePics.filter(p => p !== null).length < 3;
                case 9: return signupData.gender === 'male' && !signupData.businessCard;
                default: return true;
             }
        }
    };

    return (
        <SignupModalBase
            isOpen={isOpen}
            onClose={onClose}
            title={getStepTitle()}
            onNext={handleNext}
            onBack={handleBack}
            isFirstStep={initialSocialData ? currentStep === 2 : currentStep === 1}
            isLastStep={currentStep === finalStep}
            isNextDisabled={isNextDisabled()}
        >
            {renderStepContent()}
        </SignupModalBase>
    );
}

export default SignupFlow; 