import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { AI_MAX_MESSAGE_CHARS } from '../ai.config';

/** Page the question was asked from ("Is page ke baare mein"). */
export class AiPageContextDto {
  @IsString() @MaxLength(200) path!: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsObject() params?: Record<string, string>;
}

export class AiChatDto {
  @IsOptional() @IsUUID() conversationId?: string;
  @IsString() @MaxLength(AI_MAX_MESSAGE_CHARS) message!: string;
  @IsOptional() @IsIn(['fast', 'smart']) mode?: 'fast' | 'smart';
  @IsOptional() @ValidateNested() @Type(() => AiPageContextDto) context?: AiPageContextDto;
  @IsOptional() @IsBoolean() regenerate?: boolean;
  @IsOptional() @IsBoolean() editLast?: boolean;
  @IsOptional() @IsIn(['text', 'voice']) via?: 'text' | 'voice';
}

export class AiListDto {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

export class AiUpdateChatDto {
  @IsOptional() @IsString() @MaxLength(80) title?: string;
  @IsOptional() @IsBoolean() pinned?: boolean;
}

export class AiFeedbackDto {
  @Type(() => Number) @IsInt() @IsIn([-1, 0, 1]) value!: number;
}

export class AiReorderDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) leadDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) coverDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(180) historyDays?: number;
}

/** Field values the user changed on the action card (keys from the proposal, `qty:<productId>` for lines). */
export class AiActionConfirmDto {
  @IsOptional() @IsObject() fields?: Record<string, string | number>;
}
