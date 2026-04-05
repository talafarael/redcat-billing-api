import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto {
  @ApiProperty({
    example: 100,
    description: 'Total number of items matching the query',
  })
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number (1-based)',
  })
  page: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum number of items per page',
  })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;
}
