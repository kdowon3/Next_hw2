import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './boards.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { User } from '../users/user.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private boardsRepository: Repository<Board>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createBoardDto: CreateBoardDto, userId: number): Promise<Board> {
    const completeUser = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!completeUser) {
      throw new NotFoundException('User not found');
    }

    const board = this.boardsRepository.create({
      ...createBoardDto,
      user: completeUser,
    });
    return this.boardsRepository.save(board);
  }

  async findAll(): Promise<Board[]> {
    return this.boardsRepository.find({ relations: ['user'] });
  }

  async findOne(id: number): Promise<Board> {
    const board = await this.boardsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
    return board;
  }

  async update(
    id: number,
    updateBoardDto: UpdateBoardDto,
    userId: number,
  ): Promise<Board> {
    const board = await this.findOne(id);

    // 작성자와 요청 사용자가 동일한지 확인
    if (board.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to update this board');
    }

    await this.boardsRepository.update(id, updateBoardDto);
    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const board = await this.findOne(id);
    console.log('board:', board);

    // 작성자와 요청 사용자가 동일한지 확인
    if (board.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to delete this board');
    }

    const result = await this.boardsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
  }
}
