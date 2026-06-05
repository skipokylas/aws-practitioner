import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateCartDto {
  @IsString()
  @IsOptional()
  userId?: string;
}

export class UpsertCartItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  count!: number;
}

export class CartTotalQueryDto {
  @IsString({ each: true })
  @IsOptional()
  ids?: string[];
}

export class CartItemCountDto {
  @IsInt()
  @Min(0)
  count!: number;
}
