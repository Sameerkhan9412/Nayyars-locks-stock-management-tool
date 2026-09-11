export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import Product from '@/models/Product';
import CustomerRequirement from '@/models/CustomerRequirement';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [totalCategories, totalSubCategories, totalProducts, products, pendingRequirements, allRequirements] = await Promise.all([
      Category.countDocuments(),
      SubCategory.countDocuments(),
      Product.countDocuments(),
      Product.find()
        .populate('categoryId', 'name')
        .populate('subcategoryId', 'name'),
      CustomerRequirement.find({ overallStatus: { $ne: 'FULFILLED' } })
        .populate('items.productId', 'name stock lowStockLimit')
        .sort({ createdAt: -1 }),
      CustomerRequirement.find(),
    ]);
    
    // Available stock remaining in warehouse (after subtracting all fulfilled orders)
    const availableStock = products.reduce((acc, p) => acc + p.stock, 0);
    const lowStockProducts = products.filter(p => p.stock <= p.lowStockLimit);

    // Calculate total quantity of items fulfilled across all customer requirements
    let totalFulfilledUnits = 0;
    for (const req of allRequirements) {
      for (const item of req.items) {
        totalFulfilledUnits += (item.fulfilledQuantity || 0);
      }
    }

    const totalGrossStock = availableStock + totalFulfilledUnits;

    const customerShortages: any[] = [];
    for (const req of pendingRequirements) {
      for (const item of req.items) {
        if (item.status === 'PENDING_STOCK') {
          const productObj: any = item.productId;
          const currentStock = productObj?.stock ?? 0;
          const needed = item.requestedQuantity - (item.fulfilledQuantity || 0);
          customerShortages.push({
            requirementId: req._id,
            customerName: req.customerName,
            productId: productObj?._id || item.productId,
            productName: item.productName || productObj?.name || 'Product',
            requestedQuantity: item.requestedQuantity,
            fulfilledQuantity: item.fulfilledQuantity || 0,
            neededQuantity: needed,
            currentStock,
            deficit: Math.max(0, needed - currentStock),
            createdAt: req.createdAt,
          });
        }
      }
    }
    
    return NextResponse.json(
      {
        totalCategories,
        totalSubCategories,
        totalProducts,
        totalStock: availableStock,
        availableStock,
        totalFulfilledUnits,
        totalGrossStock,
        lowStockProducts,
        pendingRequirementsCount: pendingRequirements.length,
        customerShortages,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}


