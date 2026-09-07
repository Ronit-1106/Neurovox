#!/usr/bin/env python3
"""
Neurovox Order Processing Service (Python)
Validates orders, computes prices, sales taxes, and generates unique tracking codes.
"""
import sys
import json
import random
from datetime import datetime, timedelta

def process_order(customer_name, customer_email, mask_style, mask_color, mask_size, quantity, base_price, shipping_address, city, postal_code):
    order_id = f"NVX-{random.randint(100000, 999999)}"
    qty = max(1, int(quantity or 1))
    unit_price = float(base_price or 799.00)
    subtotal = unit_price * qty
    tax = round(subtotal * 0.05, 2)
    shipping_fee = 0.00 if subtotal >= 499.00 else 49.00
    total = round(subtotal + tax + shipping_fee, 2)

    now = datetime.utcnow()
    delivery_estimate = now + timedelta(days=3)

    return {
        "orderNumber": order_id,
        "customerName": customer_name.strip(),
        "customerEmail": customer_email.strip() if customer_email else "",
        "maskStyle": mask_style,
        "maskColor": mask_color,
        "maskSize": mask_size,
        "quantity": qty,
        "subtotal": subtotal,
        "tax": tax,
        "shippingFee": shipping_fee,
        "totalAmount": total,
        "shippingAddress": shipping_address,
        "city": city,
        "postalCode": postal_code,
        "status": "confirmed",
        "processedBy": "Python 3.10 Order Engine",
        "createdAt": now.isoformat() + "Z",
        "estimatedDelivery": delivery_estimate.strftime("%B %d, %Y")
    }

def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "Empty input"}), file=sys.stderr)
            sys.exit(1)
        data = json.loads(raw)
        res = process_order(
            customer_name=data.get("customerName", "Customer"),
            customer_email=data.get("customerEmail", ""),
            mask_style=data.get("maskStyle", "Everyday Comfort Mask"),
            mask_color=data.get("maskColor", "Sage Green"),
            mask_size=data.get("maskSize", "Medium"),
            quantity=data.get("quantity", 1),
            base_price=data.get("basePrice", 24.00),
            shipping_address=data.get("shippingAddress", ""),
            city=data.get("city", ""),
            postal_code=data.get("postalCode", "")
        )
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
