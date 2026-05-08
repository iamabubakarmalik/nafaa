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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
async function main() {
    const prisma = new client_1.PrismaClient();
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@nafaa.pk';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'NafaaAdmin@2026';
    const fullName = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    console.log(`\n🚀 Creating Super Admin...`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        if (existing.role === client_1.UserRole.SUPER_ADMIN) {
            console.log('✅ Super Admin already exists');
            await prisma.$disconnect();
            return;
        }
        await prisma.user.update({
            where: { id: existing.id },
            data: { role: client_1.UserRole.SUPER_ADMIN, isActive: true },
        });
        console.log('✅ Existing user upgraded to SUPER_ADMIN');
        await prisma.$disconnect();
        return;
    }
    let systemTenant = await prisma.tenant.findUnique({
        where: { slug: 'nafaa-system' },
    });
    if (!systemTenant) {
        systemTenant = await prisma.tenant.create({
            data: {
                name: 'Nafaa System',
                slug: 'nafaa-system',
                country: 'Pakistan',
                currency: 'PKR',
                status: 'ACTIVE',
                referralCode: `NAFAA-SYS${(0, crypto_1.randomUUID)().slice(0, 4).toUpperCase()}`,
            },
        });
        console.log('✅ System tenant created');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
        data: {
            tenantId: systemTenant.id,
            fullName,
            email,
            passwordHash,
            role: client_1.UserRole.SUPER_ADMIN,
            isActive: true,
            emailVerified: true,
        },
    });
    console.log(`\n✅ Super Admin created successfully!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`\n👉 Login at http://localhost:5174 with above credentials\n`);
    await prisma.$disconnect();
}
main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
