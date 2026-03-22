import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { User, UserStatus } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SendVerificationDto } from './dto/send-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // In-memory token store for demo; replace with persistent store/redis in production
  private passwordResetTokens: Map<string, { userId: string; expiresAt: number }> = new Map();
  private verificationCodes: Map<string, { code: string; expiresAt: number }> = new Map();

  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = port === 465; // true for 465, false for other ports
    if (!host || !user || !pass) {
      throw new BadRequestException('SMTP chưa được cấu hình');
    }
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    // Kiểm tra kết nối SMTP ngay khi khởi tạo để log lỗi cấu hình nếu có
    this.transporter.verify().then(() => {
      console.log('[SMTP] Kết nối thành công tới', host, 'port', port, secure ? '(secure 465)' : '(STARTTLS 587)');
    }).catch((err) => {
      console.error('[SMTP] Lỗi verify transporter:', err?.message || err);
    });
    return this.transporter;
  }

  async sendVerificationEmail(sendVerificationDto: SendVerificationDto) {
    const { email } = sendVerificationDto;

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if already verified
    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    this.verificationCodes.set(email, { code: otp, expiresAt });

    // Send email
    const transporter = this.getTransporter();
    const mailOptions = {
      from: this.configService.get<string>('SMTP_USER'),
      to: email,
      subject: 'Xác thực email - Discord Clone',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5865f2;">Xác thực email của bạn</h2>
          <p>Xin chào <strong>${user.display_name || user.username}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng nhập mã xác thực sau:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #5865f2; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p>Mã này sẽ hết hạn sau <strong>10 phút</strong>.</p>
          <p>Nếu bạn không yêu cầu xác thực email này, vui lòng bỏ qua email này.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { message: 'Verification email sent successfully' };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otp } = verifyEmailDto;

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Check if already verified
    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if OTP exists and is valid
    const storedData = this.verificationCodes.get(email);
    if (!storedData) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (Date.now() > storedData.expiresAt) {
      this.verificationCodes.delete(email);
      throw new BadRequestException('Verification code has expired');
    }

    if (storedData.code !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    // Verify email
    await this.userRepository.update(user.id, { email_verified: true });

    // Remove used OTP
    this.verificationCodes.delete(email);

    return { message: 'Email verified successfully' };
  }

  async register(registerDto: RegisterDto) {
    const { username, email, password, display_name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password_hash,
      display_name: display_name || username,
      status: UserStatus.OFFLINE,
      email_verified: false,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Send verification email automatically
    try {
      await this.sendVerificationEmail({ email });
    } catch (error) {
      console.error('Failed to send verification email during registration:', error);
      // Don't fail registration if email sending fails
    }

    // Generate JWT token
    const payload = { sub: savedUser.id, username: savedUser.username };
    const access_token = this.jwtService.sign(payload);

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword,
      access_token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update user status to online
    await this.userRepository.update(user.id, {
      status: UserStatus.ONLINE,
      last_seen: new Date(),
    });

    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async logout(userId: string) {
    // Update user status to offline
    await this.userRepository.update(userId, {
      status: UserStatus.OFFLINE,
      last_seen: new Date(),
    });

    return { message: 'Logout successful' };
  }

  async refreshToken(user: any) {
    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const { password_hash: _, ...result } = user;
      return result;
    }
    return null;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const user = await this.userRepository.findOne({ where: { email } });
    // Always respond success to avoid user enumeration
    if (!user) {
      return { message: 'Nếu email tồn tại, đường link đặt lại đã được gửi.' };
    }

    const token = randomBytes(32).toString('hex');
    const ttlMs = 1000 * 60 * 30; // 30 minutes
    this.passwordResetTokens.set(token, { userId: user.id, expiresAt: Date.now() + ttlMs });

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send real email
    const transporter = this.getTransporter();
    try {
      const info = await transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER'),
        to: email,
        subject: 'Đặt lại mật khẩu - Discord Clone',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
            <h2>Yêu cầu đặt lại mật khẩu</h2>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
            <p>Nhấn vào nút dưới đây để đặt lại mật khẩu (hết hạn sau 30 phút):</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;background:#5865f2;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Đặt lại mật khẩu</a>
            </p>
            <p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
            <hr />
            <p>Hoặc copy đường link: <a href="${resetUrl}">${resetUrl}</a></p>
          </div>
        `,
      });
      console.log('[ForgotPassword] Đã gửi email, messageId:', (info as any)?.messageId || info);
    } catch (err) {
      console.error('[ForgotPassword] Lỗi gửi email:', err?.message || err);
    }

    return { message: 'Nếu email tồn tại, đường link đặt lại đã được gửi.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;
    const record = this.passwordResetTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new BadRequestException('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userRepository.findOne({ where: { id: record.userId } });
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    await this.userRepository.update(user.id, { password_hash });

    // Invalidate token
    this.passwordResetTokens.delete(token);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
