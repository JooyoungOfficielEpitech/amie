"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const swagger_1 = require("../config/swagger");
// 출력 디렉토리 생성
const outputDir = path_1.default.join(__dirname, '../../swagger');
if (!fs_1.default.existsSync(outputDir)) {
    fs_1.default.mkdirSync(outputDir, { recursive: true });
}
// Swagger JSON 파일 생성
const outputPath = path_1.default.join(outputDir, 'swagger.json');
fs_1.default.writeFileSync(outputPath, JSON.stringify(swagger_1.specs, null, 2));
console.log(`Swagger JSON이 성공적으로 생성되었습니다: ${outputPath}`);
