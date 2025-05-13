"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdmin = exports.changePassword = exports.getAdminById = exports.getAllAdmins = exports.loginAdmin = exports.createAdmin = void 0;
const Admin_1 = __importStar(require("../models/Admin"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT 토큰 생성 헬퍼 함수
const generateToken = (id, email, role) => {
    return jsonwebtoken_1.default.sign({ id, email, role }, process.env.JWT_SECRET || 'admin-secret-key', { expiresIn: '1d' });
};
// 관리자 계정 생성
const createAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        // 유효성 검사
        if (!email || !password) {
            return res.status(400).json({ message: '이메일과 비밀번호는 필수 항목입니다.' });
        }
        // 이메일 중복 확인
        const adminExists = await Admin_1.default.findOne({ email });
        if (adminExists) {
            return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
        }
        // 새 관리자 생성
        const admin = new Admin_1.default({
            email,
            passwordHash: password, // 저장 시 pre 훅에서 해싱됨
            role: Admin_1.AdminRole.ADMIN
        });
        const savedAdmin = await admin.save();
        // 비밀번호 해시 제외하고 응답
        res.status(201).json({
            message: '관리자 계정이 생성되었습니다.',
            admin: {
                _id: savedAdmin._id,
                email: savedAdmin.email,
                role: savedAdmin.role
            }
        });
    }
    catch (error) {
        console.error('관리자 생성 에러:', error);
        res.status(500).json({ message: '관리자 계정 생성 중 오류가 발생했습니다.' });
    }
};
exports.createAdmin = createAdmin;
// 관리자 로그인
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        // 유효성 검사
        if (!email || !password) {
            return res.status(400).json({ message: '이메일과 비밀번호는 필수 항목입니다.' });
        }
        // 관리자 존재 확인
        const admin = await Admin_1.default.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }
        // 비밀번호 확인
        const isPasswordMatch = await admin.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }
        // JWT 토큰 생성
        const token = generateToken(admin._id, admin.email, admin.role);
        res.json({
            message: '로그인 성공',
            token,
            admin: {
                _id: admin._id,
                email: admin.email,
                role: admin.role
            }
        });
    }
    catch (error) {
        console.error('관리자 로그인 에러:', error);
        res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
    }
};
exports.loginAdmin = loginAdmin;
// 모든 관리자 조회 (슈퍼 관리자용)
const getAllAdmins = async (_req, res) => {
    try {
        const admins = await Admin_1.default.find().select('-passwordHash');
        res.json(admins);
    }
    catch (error) {
        console.error('관리자 목록 조회 에러:', error);
        res.status(500).json({ message: '관리자 목록 조회 중 오류가 발생했습니다.' });
    }
};
exports.getAllAdmins = getAllAdmins;
// 특정 관리자 조회
const getAdminById = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id).select('-passwordHash');
        if (!admin) {
            return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
        }
        res.json(admin);
    }
    catch (error) {
        console.error('관리자 조회 에러:', error);
        res.status(500).json({ message: '관리자 조회 중 오류가 발생했습니다.' });
    }
};
exports.getAdminById = getAdminById;
// 관리자 비밀번호 변경
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.params.id;
        // 유효성 검사
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호는 필수 항목입니다.' });
        }
        // 관리자 존재 확인
        const admin = await Admin_1.default.findById(adminId);
        if (!admin) {
            return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
        }
        // 현재 비밀번호 확인
        const isPasswordMatch = await admin.comparePassword(currentPassword);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
        }
        // 비밀번호 업데이트
        admin.passwordHash = newPassword;
        await admin.save();
        res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
    }
    catch (error) {
        console.error('비밀번호 변경 에러:', error);
        res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다.' });
    }
};
exports.changePassword = changePassword;
// 관리자 삭제
const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin_1.default.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
        }
        await admin.deleteOne();
        res.json({ message: '관리자가 삭제되었습니다.' });
    }
    catch (error) {
        console.error('관리자 삭제 에러:', error);
        res.status(500).json({ message: '관리자 삭제 중 오류가 발생했습니다.' });
    }
};
exports.deleteAdmin = deleteAdmin;
