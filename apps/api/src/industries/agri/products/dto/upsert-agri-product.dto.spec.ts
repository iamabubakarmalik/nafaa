import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertAgriProductDto } from './upsert-agri-product.dto';

const run = async (body: Record<string, unknown>) => {
  const dto = plainToInstance(UpsertAgriProductDto, { productId: 'p1', ...body });
  return { dto, errors: await validate(dto) };
};

describe('UpsertAgriProductDto item type', () => {
  it('keeps a valid type', async () => {
    const { dto, errors } = await run({ category: 'SEEDS' });
    expect(errors).toHaveLength(0);
    expect(dto.category).toBe('SEEDS');
  });

  it('leaves a missing type undefined so an edit keeps the stored one', async () => {
    const { dto, errors } = await run({});
    expect(errors).toHaveLength(0);
    expect(dto.category).toBeUndefined();
  });

  it.each([
    ['empty string', { category: '' }],
    ['null', { category: null }],
    ['shop category name', { category: 'Khaad aur Beej' }],
    ['shop category id', { category: 'cmabc123xyz' }],
  ])('falls back to OTHER when %s', async (_n, body) => {
    const { dto, errors } = await run(body);
    expect(errors).toHaveLength(0);
    expect(dto.category).toBe('OTHER');
  });
});
