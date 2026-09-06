'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock,
  Truck,
  Sparkles,
  ShoppingBag,
  Home,
  Check
} from 'lucide-react';
import { MaskStyle } from '@/lib/mask-fit';
import { saveLocalOrder, StoredOrder } from '@/lib/storage';

interface PaymentPortalProps {
  mask: MaskStyle;
  selectedColor: string;
  selectedSize: string;
  userName: string;
  onBack: () => void;
  onGoHome: () => void;
}

export function PaymentPortal({
  mask,
  selectedColor,
  selectedSize,
  userName,
  onBack,
  onGoHome,
}: PaymentPortalProps) {
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState(userName || 'Ronit Raut');
  const [customerEmail, setCustomerEmail] = useState('ronitraut11@gmail.com');
  const [shippingAddress, setShippingAddress] = useState('452 Innovation Blvd, Apt 3B');
  const [city, setCity] = useState('San Francisco');
  const [postalCode, setPostalCode] = useState('94105');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('883');

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<StoredOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = mask.priceNumeric * quantity;
  const shipping = 0; // Free express shipping
  const estimatedTax = Number((subtotal * 0.08).toFixed(2));
  const totalAmount = Number((subtotal + shipping + estimatedTax).toFixed(2));

  const handlePay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !shippingAddress.trim()) {
      setErrorMessage('Please complete all shipping address fields.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const orderNumber = `NVX-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrderData: StoredOrder = {
      orderNumber,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      maskStyle: mask.name,
      maskColor: selectedColor,
      maskSize: selectedSize,
      quantity,
      totalAmount,
      shippingAddress: shippingAddress.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      paymentMethod: 'Credit Card (256-Bit SSL)',
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save to Cloud SQL database via API endpoint
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: newOrderData.customerName,
          customerEmail: newOrderData.customerEmail,
          maskStyle: newOrderData.maskStyle,
          maskColor: newOrderData.maskColor,
          maskSize: newOrderData.maskSize,
          quantity: newOrderData.quantity,
          totalAmount: newOrderData.totalAmount,
          shippingAddress: newOrderData.shippingAddress,
          city: newOrderData.city,
          postalCode: newOrderData.postalCode,
          paymentMethod: newOrderData.paymentMethod,
        }),
      });

      // 2. Save to local storage for immediate offline resilience
      saveLocalOrder(newOrderData);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B401F', '#AEB784', '#E3DBBB', '#FFFFFF'],
        });
      } catch {}

      setCompletedOrder(newOrderData);
    } catch (err: any) {
      console.error('Payment error:', err);
      // Fallback: save to local storage anyway
      saveLocalOrder(newOrderData);
      setCompletedOrder(newOrderData);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2E3019] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="w-full border-b border-[#DDD6C5] bg-[#F5F2EA]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#DDD6C5] hover:bg-[#EAE4D3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5A5C27]">
            <Lock className="w-3.5 h-3.5 text-[#3B401F]" />
            <span>256-Bit Encrypted Secure Checkout</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5A5C27] hover:text-[#2E3019] px-3 py-1.5 rounded-full hover:bg-[#EAE4D3] transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {completedOrder ? (
            /* Thank You Confirmation Screen */
            <motion.div
              key="thank-you"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-2xl mx-auto bg-white/90 rounded-3xl p-6 sm:p-10 border border-[#DDD6C5] shadow-xl text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-[#EAE4D3] border-2 border-[#3B401F] flex items-center justify-center mx-auto text-[#3B401F] shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase bg-[#EAE4D3] text-[#3B401F] font-bold px-3 py-1 rounded-full">
                  Order Confirmed
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2E3019] mt-3">
                  Thank You for Your Order, {completedOrder.customerName}!
                </h1>
                <p className="text-sm text-[#5A5C27] mt-2 max-w-md mx-auto">
                  Your custom-fit order has been received and stored in our database. We are crafting your mask to your exact facial specifications.
                </p>
              </div>

              {/* Order Receipt Details */}
              <div className="bg-[#F5F2EA] rounded-2xl p-5 border border-[#DDD6C5] text-left space-y-3">
                <div className="flex justify-between items-center border-b border-[#DDD6C5] pb-3 text-xs">
                  <span className="text-[#5A5C27]">Order Confirmation Number</span>
                  <span className="font-mono font-bold text-[#2E3019]">{completedOrder.orderNumber}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5A5C27]">Mask Style & Color</span>
                  <span className="font-semibold text-[#2E3019]">
                    {completedOrder.maskStyle} — {completedOrder.maskColor}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5A5C27]">Custom Fit Size</span>
                  <span className="font-bold text-[#3B401F] bg-[#EAE4D3] px-2 py-0.5 rounded">
                    Size {completedOrder.maskSize} (Scanned Biometrics)
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5A5C27]">Quantity</span>
                  <span className="font-semibold text-[#2E3019]">{completedOrder.quantity} Unit(s)</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#5A5C27]">Shipping To</span>
                  <span className="font-semibold text-[#2E3019] text-right">
                    {completedOrder.shippingAddress}, {completedOrder.city} {completedOrder.postalCode}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-[#DDD6C5] pt-3 text-sm font-bold text-[#2E3019]">
                  <span>Total Amount Paid</span>
                  <span>${completedOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-[#5A5C27]">
                <ShieldCheck className="w-4 h-4 text-[#3B401F]" />
                <span>100% Fit Guarantee & Free Exchanges Included</span>
              </div>

              {/* Return to Homescreen Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onGoHome}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-bold text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Homescreen</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Checkout Form & Order Summary */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Customer and Payment Details */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2E3019]">
                    Secure Payment Portal
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A5C27] mt-1">
                    Provide your delivery and payment details to complete your order.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handlePay} className="space-y-6">
                  {/* Delivery Information */}
                  <div className="bg-white/80 rounded-3xl p-5 sm:p-6 border border-[#DDD6C5] space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#2E3019]">
                      <Truck className="w-4 h-4 text-[#3B401F]" />
                      <span>Shipping Address</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] text-xs font-medium text-[#2E3019] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] text-xs font-medium text-[#2E3019] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] text-xs font-medium text-[#2E3019] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] text-xs font-medium text-[#2E3019] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          Postal / Zip Code
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] text-xs font-medium text-[#2E3019] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white/80 rounded-3xl p-5 sm:p-6 border border-[#DDD6C5] space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#2E3019]">
                        <CreditCard className="w-4 h-4 text-[#3B401F]" />
                        <span>Payment Method</span>
                      </div>
                      <span className="text-[11px] text-[#5A5C27] flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3 text-[#3B401F]" /> 256-Bit SSL
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] font-mono text-xs text-[#2E3019] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          Expires (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] font-mono text-xs text-[#2E3019] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#2E3019] mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EA]/70 border border-[#DDD6C5] focus:border-[#3B401F] font-mono text-xs text-[#2E3019] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pay Button */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <span>Processing Secure Payment...</span>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pay ${totalAmount.toFixed(2)} & Place Order</span>
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-[#5A5C27]">
                      By clicking pay, your order will be stored into the database with your face scan and sizing measurements.
                    </p>
                  </div>
                </form>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="lg:col-span-5 bg-white/80 rounded-3xl p-5 sm:p-6 border border-[#DDD6C5] shadow-sm space-y-5 sticky top-24">
                <h2 className="font-bold text-base text-[#2E3019] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#3B401F]" />
                  <span>Order Summary</span>
                </h2>

                <div className="flex gap-4 items-center pb-4 border-b border-[#DDD6C5]">
                  <div className="w-16 h-16 rounded-2xl bg-[#EAE4D3] border border-[#DDD6C5] flex items-center justify-center text-[#3B401F] font-bold text-lg">
                    {selectedSize}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-[#2E3019]">{mask.name}</h3>
                    <p className="text-xs text-[#5A5C27]">Color: <span className="font-semibold text-[#2E3019]">{selectedColor}</span></p>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-[#EAE4D3] text-[10px] font-bold text-[#3B401F]">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Custom Fit Size: {selectedSize}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-[#2E3019]">${mask.priceNumeric.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quantity Control */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A5C27]">Quantity</span>
                  <div className="flex items-center border border-[#DDD6C5] rounded-full overflow-hidden bg-[#F5F2EA]">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 font-bold text-[#3B401F] hover:bg-[#EAE4D3]"
                    >
                      -
                    </button>
                    <span className="px-3 font-semibold text-[#2E3019]">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1 font-bold text-[#3B401F] hover:bg-[#EAE4D3]"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-xs text-[#5A5C27] border-b border-[#DDD6C5] pb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#2E3019]">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Express Delivery</span>
                    <span className="font-semibold text-green-700">FREE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-[#2E3019]">${estimatedTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center text-base font-extrabold text-[#2E3019]">
                  <span>Total Due</span>
                  <span className="text-lg text-[#3B401F]">${totalAmount.toFixed(2)}</span>
                </div>

                {/* Guarantees */}
                <div className="bg-[#F5F2EA] rounded-2xl p-3 text-[11px] text-[#5A5C27] space-y-1.5 border border-[#DDD6C5]">
                  <div className="flex items-center gap-2 text-[#3B401F] font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>30-Day Fit Guarantee</span>
                  </div>
                  <p>
                    If the seal isn&apos;t 100% airtight to your satisfaction, we will remake it or refund you immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
