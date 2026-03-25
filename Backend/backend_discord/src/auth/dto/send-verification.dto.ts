import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
