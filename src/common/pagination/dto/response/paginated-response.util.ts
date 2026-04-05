import { PaginationQueryDto } from '../request/pagination-query.dto';
import { PaginatedResponse } from '../../interfaces/paginated-response.interface';

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
