import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserProfileService } from './userprofile.service';
import { CreateUserProfileDto } from './dto/create-userprofile.dto';
import { UpdateUserProfileDto } from './dto/update-userprofile.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserProfile } from './userprofile.entity';

@Controller('profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Request() req,
    @Body() createUserProfileDto: CreateUserProfileDto,
  ): Promise<UserProfile> {
    const userId = req.user.userId;
    return this.userProfileService.create(userId, createUserProfileDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findOne(@Request() req): Promise<UserProfile> {
    const userId = req.user.userId;
    return this.userProfileService.findOne(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch()
  async update(
    @Request() req,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    const userId = req.user.userId;
    return this.userProfileService.update(userId, updateUserProfileDto);
  }
}
