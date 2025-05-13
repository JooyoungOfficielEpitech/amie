"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSignupImages = exports.uploadBusinessCard = exports.uploadProfileImages = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// 디렉토리 존재 확인 및 생성 함수
const ensureDirExists = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
// 파일 필터 (이미지만 허용)
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
};
// 프로필 이미지 저장 설정
const profileImageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.join(__dirname, '..', '..', 'public', 'profile-image');
        ensureDirExists(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});
// 명함 이미지 저장 설정
const businessCardStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = path_1.default.join(__dirname, '..', '..', 'public', 'business-card');
        ensureDirExists(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});
// Multer 인스턴스 생성
exports.uploadProfileImages = (0, multer_1.default)({
    storage: profileImageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 } // 5MB 제한, 최대 3개
}).array('profileImages', 3); // <input name="profileImages">, 최대 3개
exports.uploadBusinessCard = (0, multer_1.default)({
    storage: businessCardStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
}).single('businessCardImage'); // <input name="businessCardImage">
// 두 필드를 함께 처리하는 미들웨어 (필요시)
exports.uploadSignupImages = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            let dest;
            if (file.fieldname === 'profileImages') {
                dest = path_1.default.join(__dirname, '..', '..', 'public', 'profile-image');
            }
            else if (file.fieldname === 'businessCardImage') {
                dest = path_1.default.join(__dirname, '..', '..', 'public', 'business-card');
            }
            else {
                // 예상치 못한 필드 처리 (임시 디렉토리 등)
                dest = path_1.default.join(__dirname, '..', '..', 'public', 'temp');
            }
            ensureDirExists(dest);
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = (0, uuid_1.v4)();
            const extension = path_1.default.extname(file.originalname);
            cb(null, `${uniqueSuffix}${extension}`);
        }
    }),
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).fields([
    { name: 'profileImages', maxCount: 3 },
    { name: 'businessCardImage', maxCount: 1 }
]);
