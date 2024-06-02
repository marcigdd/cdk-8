import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, DeleteResult } from 'typeorm';
import { CartEntity, CartItemEntity } from 'src/entitities/entitities';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<CartEntity> {
    return this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });
  }

  async createByUserId(userId: string): Promise<CartEntity> {
    const newCart = this.cartRepository.create({ userId });
    return this.cartRepository.save(newCart);
  }

  async findOrCreateByUserId(userId: string): Promise<CartEntity> {
    let cart = await this.findByUserId(userId);
    if (!cart) {
      cart = await this.createByUserId(userId);
    }
    return cart;
  }

  async updateByUserId(
    userId: string,
    cartData: DeepPartial<CartEntity>,
  ): Promise<CartEntity> {
    let cart = await this.findOrCreateByUserId(userId);
    if (cartData.items) {
      // Remove all existing items
      await this.cartItemRepository.remove(cart.items);
      // Create new items
      cart.items = await this.cartItemRepository.save(cartData.items);
    }
    // Update the cart
    cart = this.cartRepository.merge(cart, cartData);
    return this.cartRepository.save(cart);
  }

  async removeByUserId(userId: string): Promise<DeleteResult> {
    const cart = await this.findByUserId(userId);
    if (cart) {
      // Remove all items in the cart before deleting the cart
      await this.cartItemRepository.remove(cart.items);
      return this.cartRepository.delete(cart.id);
    }
    return null;
  }
}
