import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import Product from '@/models/Product';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [totalCategories, totalSubCategories, totalProducts, products] = await Promise.all([
      Category.countDocuments(),
      SubCategory.countDocuments(),
      Product.countDocuments(),
      Product.find()
        .populate('categoryId', 'name')
        .populate('subcategoryId', 'name'),
    ]);
    
    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    
    const lowStockProducts = products.filter(p => p.stock <= p.lowStockLimit);
    
    return NextResponse.json({
      totalCategories,
      totalSubCategories,
      totalProducts,
      totalStock,
      lowStockProducts,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
