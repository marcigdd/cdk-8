import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import { Cart } from '../models';
import { InjectRepository } from '@nestjs/typeorm';
import { CartEntity, CartItemEntity } from 'src/entitities/entitities';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}
  private userCarts: Record<string, Cart> = {};

  async findByUserId(userId: string): Promise<CartEntity> {
    const found = (await this.cartRepository.find({ where: { userId } }))[0];
    console.log('Found:', found);
    return found;
  }

  async createByUserId(userId: string) {
    const id = v4(v4());
    const userCart = {
      id,
      items: [],
    };

    const saved = await this.cartRepository.save({
      id,
      userId,
      items: [],
    });

    console.log('Saved:', saved);

    return saved;
  }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return await this.createByUserId(userId);
  }

  async updateByUserId(
    userId: string,
    { items }: Cart,
  ): Promise<
    {
      id?: number;
      userId?: string;
      items?: DeepPartial<CartItemEntity[]>;
    } & CartEntity
  > {
    const { id, ...rest } = await this.findOrCreateByUserId(userId);

    const updatedCart: DeepPartial<CartEntity> = {
      id,
      ...rest,
      items: items.map((item) => ({ ...item } as DeepPartial<CartItemEntity>)),
    };

    const updated = await this.cartRepository.save(updatedCart);
    console.log('Updated:', updated);
    return updated;
  }

  async removeByUserId(userId: string): Promise<DeleteResult> {
    const deleted = await this.cartRepository.delete({ userId });
    console.log('Deleted:', deleted);
    return deleted;
  }
}
