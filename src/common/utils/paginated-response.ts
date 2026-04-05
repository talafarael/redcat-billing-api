import { PaginationQueryDto } from '../dto/request/pagination-query.dto';
import { PaginatedResponse } from '../interfaces/paginated-response';

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  { page, limit }: PaginationQueryDto,
): PaginatedResponse<T> => {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
