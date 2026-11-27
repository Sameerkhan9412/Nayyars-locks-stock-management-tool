export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import CustomerRequirement from '@/models/CustomerRequirement';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';
import { customerRequirementEditSchema } from '@/lib/validations';

function ensureModelsRegistered() {
  if (!mongoose.models.Product) {
    mongoose.model('Product', Product.schema);
  }
  if (!mongoose.models.User) {
    mongoose.model('User', User.schema);
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    ensureModelsRegistered();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const requirement = await CustomerRequirement.findById(id)
      .populate('items.productId', 'name stock lowStockLimit')
      .populate('createdBy', 'name');

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    return NextResponse.json({ requirement });
  } catch (error: any) {
    console.error('Failed to fetch requirement:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch requirement',
        message: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Trigger re-check & fulfillment OR Mark as Delivered.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    ensureModelsRegistered();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const requirement = await CustomerRequirement.findById(id);

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    // Handle "MARK_DELIVERED" action
    if (body.action === 'MARK_DELIVERED') {
      requirement.overallStatus = 'DELIVERED';
      requirement.deliveredAt = new Date();
      await requirement.save();

      const updated = await CustomerRequirement.findById(id)
        .populate('items.productId', 'name stock lowStockLimit')
        .populate('createdBy', 'name');

      return NextResponse.json({
        success: true,
        message: 'Order marked as Delivered',
        requirement: updated,
      });
    }

    // Handle "EDIT" action: update customer details and items, reconciling stock
    if (body.action === 'EDIT') {
      if (requirement.overallStatus === 'DELIVERED' || requirement.overallStatus === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Delivered or cancelled orders cannot be edited' },
          { status: 400 }
        );
      }

      const parsed = customerRequirementEditSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      const { customerName, customerPhone, note, items } = parsed.data;

      // Validate every product up front, before touching any stock
      const productMap = new Map<string, any>();
      for (const input of items) {
        if (!mongoose.Types.ObjectId.isValid(input.productId)) {
          return NextResponse.json({ error: 'Invalid product selected' }, { status: 400 });
        }
        if (!productMap.has(input.productId)) {
          const product = await Product.findById(input.productId);
          if (!product) {
            return NextResponse.json({ error: 'Selected product no longer exists' }, { status: 404 });
          }
          productMap.set(input.productId, product);
        }
      }

      const returnStock = async (productId: any, qty: number, productName: string) => {
        if (!qty || qty <= 0) return;
        const product = await Product.findById(productId);
        if (!product) return;
        const prevStock = product.stock;
        product.stock += qty;
        await product.save();
        await StockMovement.create({
          productId: product._id,
          type: 'IN',
          quantity: qty,
          previousStock: prevStock,
          newStock: product.stock,
          note: `Order edited: ${requirement.customerName} - Restored ${productName}`,
          createdBy: user.id,
        });
      };

      const existingById = new Map<string, any>(
        requirement.items.map((it: any) => [it._id.toString(), it])
      );
      const keptIds = new Set<string>();
      const newItems: any[] = [];

      for (const input of items) {
        const qty = Number(input.requestedQuantity);
        const product = productMap.get(input.productId);
        const existing = input.itemId ? existingById.get(input.itemId) : undefined;

        if (existing && !keptIds.has(input.itemId as string)) {
          keptIds.add(input.itemId as string);
          const alreadyFulfilled = existing.fulfilledQuantity || 0;

          if (existing.productId.toString() === input.productId) {
            // Same product: keep what is already deducted; give back any excess if qty was reduced
            let fulfilled = alreadyFulfilled;
            if (fulfilled > qty) {
              await returnStock(existing.productId, fulfilled - qty, product.name);
              fulfilled = qty;
            }
            newItems.push({
              _id: existing._id,
              productId: product._id,
              productName: product.name,
              requestedQuantity: qty,
              fulfilledQuantity: fulfilled,
              status: fulfilled >= qty ? 'FULFILLED' : 'PENDING_STOCK',
            });
            continue;
          }

          // Product was swapped: return the old product's deducted stock
          await returnStock(existing.productId, alreadyFulfilled, existing.productName);
        }

        newItems.push({
          productId: product._id,
          productName: product.name,
          requestedQuantity: qty,
          fulfilledQuantity: 0,
          status: 'PENDING_STOCK',
        });
      }

      // Items that were removed from the order: return their deducted stock
      for (const [itemId, existing] of existingById) {
        if (!keptIds.has(itemId)) {
          await returnStock(existing.productId, existing.fulfilledQuantity || 0, existing.productName);
        }
      }

      // Try to fulfill anything still pending with the stock available right now
      for (const item of newItems) {
        if (item.status !== 'PENDING_STOCK') continue;
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const needed = item.requestedQuantity - item.fulfilledQuantity;
        if (product.stock >= needed) {
          const prevStock = product.stock;
          product.stock -= needed;
          await product.save();
          item.fulfilledQuantity = item.requestedQuantity;
          item.status = 'FULFILLED';
          await StockMovement.create({
            productId: product._id,
            type: 'OUT',
            quantity: needed,
            previousStock: prevStock,
            newStock: product.stock,
            note: `Customer order (edited): ${customerName.trim()} - Item: ${product.name}`,
            createdBy: user.id,
          });
        }
      }

      const allFulfilled = newItems.every((it) => it.status === 'FULFILLED');
      const anyFulfilled = newItems.some((it) => it.fulfilledQuantity > 0);

      requirement.customerName = customerName.trim();
      requirement.customerPhone = customerPhone ? customerPhone.trim() : '';
      requirement.note = note ? note.trim() : '';
      requirement.items = newItems;
      requirement.overallStatus = allFulfilled
        ? 'FULFILLED'
        : anyFulfilled
        ? 'PARTIALLY_FULFILLED'
        : 'PENDING_STOCK';
      await requirement.save();

      const updated = await CustomerRequirement.findById(id)
        .populate('items.productId', 'name stock lowStockLimit')
        .populate('createdBy', 'name');

      return NextResponse.json({
        success: true,
        message: 'Order updated',
        requirement: updated,
      });
    }

    // Default: Check and fulfill pending items
    let modified = false;

    for (const item of requirement.items) {
      if (item.status === 'PENDING_STOCK') {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const needed = item.requestedQuantity - (item.fulfilledQuantity || 0);
        if (product.stock >= needed) {
          const prevStock = product.stock;
          product.stock -= needed;
          await product.save();

          item.fulfilledQuantity = item.requestedQuantity;
          item.status = 'FULFILLED';
          modified = true;

          await StockMovement.create({
            productId: product._id,
            type: 'OUT',
            quantity: needed,
            previousStock: prevStock,
            newStock: product.stock,
            note: `Manual fulfilled requirement for ${requirement.customerName}`,
            createdBy: user.id,
          });
        }
      }
    }

    if (modified) {
      const allFulfilled = requirement.items.every((it: any) => it.status === 'FULFILLED');
      const anyFulfilled = requirement.items.some(
        (it: any) => it.status === 'FULFILLED' || (it.fulfilledQuantity && it.fulfilledQuantity > 0)
      );

      requirement.overallStatus = allFulfilled
        ? 'FULFILLED'
        : anyFulfilled
        ? 'PARTIALLY_FULFILLED'
        : 'PENDING_STOCK';

      await requirement.save();
    }

    const updated = await CustomerRequirement.findById(id)
      .populate('items.productId', 'name stock lowStockLimit')
      .populate('createdBy', 'name');

    return NextResponse.json({
      success: true,
      requirement: updated,
      modified,
    });
  } catch (error: any) {
    console.error('Failed to update requirement:', error);
    return NextResponse.json(
      {
        error: 'Failed to update requirement',
        message: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete or Cancel a customer requirement.
 * Query param: ?restoreStock=true will return fulfilled items back to inventory stock.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    ensureModelsRegistered();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const restoreStock = searchParams.get('restoreStock') === 'true';

    const requirement = await CustomerRequirement.findById(id);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    // If cancelling and restoring stock back to warehouse
    if (restoreStock) {
      for (const item of requirement.items) {
        const fulfilledQty = item.fulfilledQuantity || 0;
        if (fulfilledQty > 0) {
          const product = await Product.findById(item.productId);
          if (product) {
            const prevStock = product.stock;
            product.stock += fulfilledQty;
            await product.save();

            await StockMovement.create({
              productId: product._id,
              type: 'IN',
              quantity: fulfilledQty,
              previousStock: prevStock,
              newStock: product.stock,
              note: `Order cancelled: ${requirement.customerName} - Restored ${item.productName}`,
              createdBy: user.id,
            });
          }
        }
      }
    }

    await CustomerRequirement.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      restoredStock: restoreStock,
      message: restoreStock
        ? 'Order cancelled and stock restored to warehouse successfully'
        : 'Order record deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete requirement:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete requirement',
        message: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

