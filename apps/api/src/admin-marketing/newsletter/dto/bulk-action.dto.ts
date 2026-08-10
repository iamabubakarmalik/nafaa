import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum BulkAction {
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  DELETE = 'DELETE',
  TAG = 'TAG',
  UNTAG = 'UNTAG',
  MARK_BOUNCED = 'MARK_BOUNCED',
  REACTIVATE = 'REACTIVATE',
}

export class BulkActionDto {
  @IsArray() @IsString({ each: true }) subscriberIds!: string[];
  @IsEnum(BulkAction) action!: BulkAction;
  @IsOptional() @IsString() tag?: string;
}
