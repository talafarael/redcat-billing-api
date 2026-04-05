import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/role.guard';
import { Roles } from '@/auth/decorators/role.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Role } from '@/users/enums/role.enum';
import { User } from '@/users/entities/user.entity';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto } from './dto/request/create-deposit.dto';
import { CreateTransferDto } from './dto/request/create-transfer.dto';
import { TransactionResponseDto } from './dto/response/transaction.dto';
import { PaginatedTransactionsResponseDto } from './dto/response/paginated-transactions.dto';
import { PaginationQueryDto } from '@/common/dto/request/pagination-query.dto';

@ApiTags('transactions')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds to a user account' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid amount or recipient deactivated',
  })
  @ApiNotFoundResponse({ description: 'Recipient not found' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  createDeposit(
    @Body() dto: CreateDepositDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.createDeposit(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds to another user' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Insufficient funds or invalid input' })
  @ApiNotFoundResponse({ description: 'Recipient not found' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: User,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.createTransfer(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get own transactions',
    description:
      'Returns a paginated list of transactions where the authenticated user is sender or recipient.',
  })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getMyTransactions(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedTransactionsResponseDto> {
    return this.transactionsService.getMyTransactions(user.id, query);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get all transactions (Admin only)',
    description: 'Returns a paginated list of all transactions in the system.',
  })
  @ApiOkResponse({ type: PaginatedTransactionsResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  getAllTransactions(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedTransactionsResponseDto> {
    return this.transactionsService.getAllTransactions(query);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a transaction',
    description:
      'Clients can cancel their own transactions. Admins can cancel any transaction. Cancelling reverses the balance changes.',
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({ description: 'Transaction not found' })
  @ApiForbiddenResponse({ description: 'Not your transaction' })
  @ApiConflictResponse({ description: 'Transaction is already cancelled' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  cancelTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.cancelTransaction(id, user.id, user.role);
  }
}
