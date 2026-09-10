import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import StockMovement from '@/models/StockMovement';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Ensure referenced models are registered in Mongoose to prevent MissingSchemaError during populate
    if (!mongoose.models.Product) {
      mongoose.model('Product', Product.schema);
    }
    if (!mongoose.models.User) {
      mongoose.model('User', User.schema);
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    
    const query: any = {};
    if (productId && productId !== 'undefined' && productId !== 'null' && productId.trim() !== '') {
      const cleanId = productId.trim();
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        query.productId = cleanId;
      } else {
        // Return empty result rather than failing with a 500 CastError
        return NextResponse.json({ history: [] });
      }
    }

    if (type === 'IN' || type === 'OUT') {
      query.type = type;
    }
    
    const history = await StockMovement.find(query)
      .populate('productId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
      
    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Failed to fetch stock history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock history', message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

