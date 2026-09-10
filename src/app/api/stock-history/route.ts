import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StockMovement from '@/models/StockMovement';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    const query: any = {};
    if (productId) query.productId = productId;
    
    const history = await StockMovement.find(query)
      .populate('productId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
      
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stock history' }, { status: 500 });
  }
}
