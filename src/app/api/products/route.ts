import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import SubCategory from '@/models/SubCategory';
import StockMovement from '@/models/StockMovement';
import { productSchema } from '@/lib/validations';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const search = searchParams.get('search');
    
    const query: any = {};
    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    if (search) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 10;
    
    const total = await Product.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const result = productSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { name, categoryId, subcategoryId, stock, lowStockLimit } = result.data;
    
    const categoryExists = await Category.exists({ _id: categoryId });
    if (!categoryExists) {
      return NextResponse.json({ error: 'Selected category does not exist' }, { status: 400 });
    }
    
    if (subcategoryId && subcategoryId !== '') {
      const subcategoryExists = await SubCategory.exists({ _id: subcategoryId, categoryId });
      if (!subcategoryExists) {
        return NextResponse.json({ error: 'Selected subcategory does not exist under this category' }, { status: 400 });
      }
    }
    
    const product = await Product.create({
      name: name.trim(),
      categoryId,
      subcategoryId: subcategoryId && subcategoryId !== '' ? subcategoryId : null,
      stock,
      lowStockLimit,
    });
    
    if (stock > 0) {
      await StockMovement.create({
        productId: product._id,
        type: 'IN',
        quantity: stock,
        previousStock: 0,
        newStock: stock,
        createdBy: user.id,
      });
    }
    
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
