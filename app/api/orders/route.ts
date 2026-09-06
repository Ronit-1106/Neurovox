import { NextRequest, NextResponse } from 'next/server';
import { getOrders, saveOrderRecord } from '@/src/db/orders';
import { adminAuth } from '@/lib/firebase-admin';
import { runPythonEngine } from '@/lib/python-bridge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || undefined;

    const orders = await getOrders(email);
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let uid: string | undefined = undefined;
    let authEmail: string | undefined = undefined;

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        authEmail = decodedToken.email;
      } catch (authErr) {
        console.warn('Optional auth token validation skipped:', authErr);
      }
    }

    if (!body.customerName || !body.customerEmail || !body.maskStyle || !body.maskSize || !body.totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required order details' },
        { status: 400 }
      );
    }

    // Process & calculate order details using Python Order Engine
    let pyOrder: any = null;
    try {
      pyOrder = await runPythonEngine<any, any>('orders.py', {
        customerName: body.customerName,
        customerEmail: body.customerEmail || authEmail,
        maskStyle: body.maskStyle,
        maskColor: body.maskColor || 'Midnight Black',
        maskSize: body.maskSize,
        quantity: Number(body.quantity) || 1,
        basePrice: Number(body.totalAmount) / (Number(body.quantity) || 1),
        shippingAddress: body.shippingAddress || '123 Innovation Way',
        city: body.city || 'Tech City',
        postalCode: body.postalCode || '94043',
      });
    } catch (pyErr) {
      console.warn('Python order engine warning, falling back to direct calculation:', pyErr);
    }

    const order = await saveOrderRecord({
      uid,
      orderNumber: pyOrder?.orderNumber,
      customerName: pyOrder?.customerName || body.customerName,
      customerEmail: body.customerEmail || authEmail || 'customer@example.com',
      maskStyle: pyOrder?.maskStyle || body.maskStyle,
      maskColor: pyOrder?.maskColor || body.maskColor || 'Midnight Black',
      maskSize: pyOrder?.maskSize || body.maskSize,
      quantity: pyOrder?.quantity || Number(body.quantity) || 1,
      totalAmount: pyOrder?.totalAmount || Number(body.totalAmount),
      shippingAddress: pyOrder?.shippingAddress || body.shippingAddress || '123 Innovation Way',
      city: pyOrder?.city || body.city || 'Tech City',
      postalCode: pyOrder?.postalCode || body.postalCode || '94043',
      paymentMethod: body.paymentMethod || 'Credit Card',
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        processedBy: 'Python 3.10 Engine + Cloud SQL',
        estimatedDelivery: pyOrder?.estimatedDelivery,
      },
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process order' },
      { status: 500 }
    );
  }
}
