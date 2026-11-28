export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import CustomerRequirement from '@/models/CustomerRequirement';
import { getSessionUser } from '@/lib/auth';

/**
 * Purchase planner: analyses pending customer orders + current stock and
 * works out how many units of each product still need to be ordered.
 *
 *   pendingDemand = units customers still need that have not been deducted yet
 *   toOrder       = max(0, pendingDemand - stock)
 *
 * Only customer requirements are considered (the low-stock limit is NOT added).
 */
export async function GET() {
  try {
    await dbConnect();
    // make sure populated models are registered
    void Category;
    void SubCategory;

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [products, requirements] = await Promise.all([
      Product.find()
        .populate('categoryId', 'name')
        .populate('subcategoryId', 'name')
        .lean(),
      CustomerRequirement.find({
        overallStatus: { $nin: ['DELIVERED', 'CANCELLED'] },
      }).lean(),
    ]);

    // productId -> { pendingDemand, customers[] }
    const demand = new Map<string, { pendingDemand: number; customers: { name: string; qty: number }[] }>();
    for (const req of requirements as any[]) {
      for (const item of req.items || []) {
        if (item.status !== 'PENDING_STOCK') continue;
        const need = (item.requestedQuantity || 0) - (item.fulfilledQuantity || 0);
        if (need <= 0 || !item.productId) continue;
        const key = item.productId.toString();
        const entry = demand.get(key) || { pendingDemand: 0, customers: [] };
        entry.pendingDemand += need;
        entry.customers.push({ name: req.customerName, qty: need });
        demand.set(key, entry);
      }
    }

    const rows = (products as any[])
      .map((p) => {
        const d = demand.get(p._id.toString());
        const pendingDemand = d?.pendingDemand ?? 0;
        const stock = p.stock ?? 0;
        const toOrder = Math.max(0, pendingDemand - stock);
        return {
          productId: p._id.toString(),
          name: p.name,
          category: p.categoryId?.name || '',
          subcategory: p.subcategoryId?.name || '',
          stock,
          pendingDemand,
          toOrder,
          customers: d?.customers ?? [],
        };
      })
      .filter((r) => r.toOrder > 0)
      .sort((a, b) => b.toOrder - a.toOrder);

    const summary = {
      productsToOrder: rows.length,
      totalUnitsToOrder: rows.reduce((acc, r) => acc + r.toOrder, 0),
      openOrders: requirements.length,
    };

    return NextResponse.json(
      { rows, summary },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error) {
    console.error('Order planner API error:', error);
    return NextResponse.json({ error: 'Failed to build order plan' }, { status: 500 });
  }
}
