import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class AdminRegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, and number/special character',
  })
  password: string

  @IsString()
  @IsIn(['admin', 'super_admin'])
  role: string
}
