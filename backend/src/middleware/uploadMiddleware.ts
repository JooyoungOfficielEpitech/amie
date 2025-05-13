import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// 디렉토리 존재 확인 및 생성 함수
const ensureDirExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// 파일 필터 (이미지만 허용)
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
};

// 프로필 이미지 저장 설정
const profileImageStorage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const dest = path.join(__dirname, '..', '..', 'public', 'profile-image');
        ensureDirExists(dest);
        cb(null, dest);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});

// 명함 이미지 저장 설정
const businessCardStorage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        const dest = path.join(__dirname, '..', '..', 'public', 'business-card');
        ensureDirExists(dest);
        cb(null, dest);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});

// Multer 인스턴스 생성
export const uploadProfileImages = multer({
    storage: profileImageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 } // 5MB 제한, 최대 3개
}).array('profileImages', 3); // <input name="profileImages">, 최대 3개

export const uploadBusinessCard = multer({
    storage: businessCardStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
}).single('businessCardImage'); // <input name="businessCardImage">

// 두 필드를 함께 처리하는 미들웨어 (필요시)
export const uploadSignupImages = multer({
    storage: multer.diskStorage({
         destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
             let dest;
             if (file.fieldname === 'profileImages') {
                 dest = path.join(__dirname, '..', '..', 'public', 'profile-image');
             } else if (file.fieldname === 'businessCardImage') {
                 dest = path.join(__dirname, '..', '..', 'public', 'business-card');
             } else {
                 // 예상치 못한 필드 처리 (임시 디렉토리 등)
                 dest = path.join(__dirname, '..', '..', 'public', 'temp');
             }
             ensureDirExists(dest);
             cb(null, dest);
         },
         filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
             const uniqueSuffix = uuidv4();
             const extension = path.extname(file.originalname);
             cb(null, `${uniqueSuffix}${extension}`);
         }
    }),
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).fields([
    { name: 'profileImages', maxCount: 3 },
    { name: 'businessCardImage', maxCount: 1 }
]); 