export const dynamic = 'force-dynamic';

import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import CustomerRequirement from '@/models/CustomerRequirement';
import User from '@/models/User';
import { customerRequirementSchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';

function ensureModelsRegistered() {
  if (!mongoose.models.Product) {
    mongoose.model('Product', Product.schema);
  }
  if (!mongoose.models.User) {
    mongoose.model('User', User.schema);
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    ensureModelsRegistered();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = {};
    if (status && status !== 'ALL') {
      if (status === 'PENDING_STOCK') {
        query.overallStatus = { $in: ['PENDING_STOCK', 'PARTIALLY_FULFILLED'] };
      } else {
        query.overallStatus = status;
      }
    }

    if (search && search.trim() !== '') {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      query.$or = [
        { customerName: regex },
        { 'items.productName': regex },
        { customerPhone: regex },
      ];
    }

    const requirements = await CustomerRequirement.find(query)
      .populate('items.productId', 'name stock lowStockLimit')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { requirements },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to fetch customer requirements:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch customer requirements',
        message: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    ensureModelsRegistered();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = customerRequirementSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { customerName, customerPhone, note, items } = result.data;

    const processedItems = [];
    let hasShortage = false;
    let hasFulfilled = false;

    for (const itemInput of items) {
      const product = await Product.findById(itemInput.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${itemInput.productId}` },
          { status: 404 }
        );
      }

      const requestedQty = Number(itemInput.requestedQuantity);
      if (product.stock >= requestedQty) {
        // Sufficient stock: deduct immediately
        const prevStock = product.stock;
        product.stock -= requestedQty;
        await product.save();

        await StockMovement.create({
          productId: product._id,
          type: 'OUT',
          quantity: requestedQty,
          previousStock: prevStock,
          newStock: product.stock,
          note: `Customer order: ${customerName} - Item: ${product.name}`,
          createdBy: user.id,
        });

        processedItems.push({
          productId: product._id,
          productName: product.name,
          requestedQuantity: requestedQty,
          fulfilledQuantity: requestedQty,
          status: 'FULFILLED' as const,
        });
        hasFulfilled = true;
      } else {
        // Insufficient stock: mark as shortage / pending
        processedItems.push({
          productId: product._id,
          productName: product.name,
          requestedQuantity: requestedQty,
          fulfilledQuantity: 0,
          status: 'PENDING_STOCK' as const,
        });
        hasShortage = true;
      }
    }

    const overallStatus =
      !hasShortage && hasFulfilled
        ? 'FULFILLED'
        : hasFulfilled && hasShortage
        ? 'PARTIALLY_FULFILLED'
        : 'PENDING_STOCK';

    const requirement = await CustomerRequirement.create({
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : '',
      note: note ? note.trim() : '',
      items: processedItems,
      overallStatus,
      createdBy: user.id,
    });

    const populated = await CustomerRequirement.findById(requirement._id)
      .populate('items.productId', 'name stock lowStockLimit')
      .populate('createdBy', 'name');

    return NextResponse.json({
      success: true,
      requirement: populated,
    });
  } catch (error: any) {
    console.error('Failed to create customer requirement:', error);
    return NextResponse.json(
      {
        error: 'Failed to create customer requirement',
        message: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
