export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import CustomerRequirement from '@/models/CustomerRequirement';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
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
  } catch (error) {
    console.error('Failed to fetch requirement:', error);
    return NextResponse.json({ error: 'Failed to fetch requirement' }, { status: 500 });
  }
}

/**
 * PUT: Trigger re-check & fulfillment OR Mark as Delivered.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
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
  } catch (error) {
    console.error('Failed to update requirement:', error);
    return NextResponse.json({ error: 'Failed to update requirement' }, { status: 500 });
  }
}

/**
 * DELETE: Delete or Cancel a customer requirement.
 * Query param: ?restoreStock=true will return fulfilled items back to inventory stock.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
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
  } catch (error) {
    console.error('Failed to delete requirement:', error);
    return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 });
  }
}

