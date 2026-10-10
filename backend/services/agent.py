import os
import json
import re
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from sqlalchemy.orm import Session
try:
    from groq import Groq
except ImportError:
    Groq = None
import backend.models.core as models

load_dotenv()

# --- Tool Implementations ---

def tool_get_stock_status(query: str, db: Session) -> Dict[str, Any]:
    q = query.strip()
    product = db.query(models.Product).filter(
        (models.Product.sku.ilike(f"%{q}%")) | (models.Product.name.ilike(f"%{q}%"))
    ).first()

    if not product:
        return {"found": False, "message": f"I couldn't find any product matching '{query}' in our catalog."}

    cat_name = product.category_obj.name if product.category_obj else "General"
    sup_name = product.supplier_obj.name if product.supplier_obj else "Direct Vendor"

    status = "OUT OF STOCK" if product.quantity <= 0 else "LOW STOCK" if product.quantity <= product.reorder_level else "IN STOCK"

    return {
        "found": True,
        "sku": product.sku,
        "name": product.name,
        "quantity": product.quantity,
        "reorderLevel": product.reorder_level,
        "price": product.price,
        "cost": product.cost,
        "category": cat_name,
        "supplier": sup_name,
        "status": status,
        "message": (
            f"**{product.name}** (`{product.sku}`):\n"
            f"• Current Stock: **{product.quantity} units** ({status})\n"
            f"• Reorder Threshold: {product.reorder_level} units\n"
            f"• Unit Price: ₹{product.price:.2f} (Cost: ₹{product.cost:.2f})\n"
            f"• Preferred Supplier: {sup_name}"
        ),
    }

def tool_list_low_stock(db: Session) -> Dict[str, Any]:
    products = db.query(models.Product).filter(models.Product.quantity <= models.Product.reorder_level).all()
    if not products:
        return {
            "count": 0,
            "message": "Excellent news! All products are currently stocked comfortably above their minimum reorder levels.",
        }

    lines = [f"Found **{len(products)} products** at or below reorder threshold:"]
    for p in products:
        tag = "🔴 OUT" if p.quantity <= 0 else "🟡 LOW"
        lines.append(f"• `{p.sku}` **{p.name}**: {p.quantity} on hand (min {p.reorder_level}) [{tag}]")

    return {
        "count": len(products),
        "items": [{"sku": p.sku, "name": p.name, "quantity": p.quantity, "min": p.reorder_level} for p in products],
        "message": "\n".join(lines),
    }

def tool_get_inventory_summary(db: Session) -> Dict[str, Any]:
    products = db.query(models.Product).all()
    total_val = sum(p.quantity * p.price for p in products)
    low_stock = sum(1 for p in products if 0 < p.quantity <= p.reorder_level)
    out_stock = sum(1 for p in products if p.quantity <= 0)
    sales = db.query(models.Order).count()
    revenue = sum(o.total for o in db.query(models.Order).all())

    return {
        "totalValue": total_val,
        "totalProducts": len(products),
        "revenue": revenue,
        "message": (
            f"📊 **Current Warehouse Summary:**\n"
            f"• Total Inventory Valuation: **₹{total_val:,.2f}**\n"
            f"• Active SKUs: **{len(products)} products**\n"
            f"• Stock Health: {len(products) - low_stock - out_stock} healthy, {low_stock} low stock, {out_stock} out of stock\n"
            f"• Total Sales Volume: **₹{revenue:,.2f}** across {sales} orders."
        ),
    }

def tool_draft_purchase_order(product_query: str, quantity: int, db: Session) -> Dict[str, Any]:
    product = db.query(models.Product).filter(
        (models.Product.sku.ilike(f"%{product_query}%")) | (models.Product.name.ilike(f"%{product_query}%"))
    ).first()

    if not product:
        return {"success": False, "message": f"Cannot draft PO: Product '{product_query}' was not found in catalog."}

    sup = product.supplier_obj
    sup_name = sup.name if sup else "Primary Vendor"
    total_cost = round(product.cost * quantity, 2)

    return {
        "success": True,
        "action": {
            "type": "APPROVE_PO",
            "productId": product.id,
            "sku": product.sku,
            "productName": product.name,
            "supplierName": sup_name,
            "quantity": quantity,
            "estimatedCost": total_cost,
        },
        "message": (
            f"I have prepared a draft Purchase Order for you:\n"
            f"• **Product**: {product.name} (`{product.sku}`)\n"
            f"• **Quantity**: {quantity} units\n"
            f"• **Supplier**: {sup_name}\n"
            f"• **Total Estimated Cost**: **₹{total_cost:,.2f}**\n\n"
            f"Click the confirmation button below to submit this order directly into the database."
        ),
    }

def tool_execute_purchase_order(product_id: str, quantity: int, db: Session) -> Dict[str, Any]:
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        return {"success": False, "message": "Product not found."}

    sup = prod.supplier_obj
    po_num = f"PO-{5580 + db.query(models.PurchaseOrder).count() + 1}"
    total_cost = round(prod.cost * quantity, 2)

    new_po = models.PurchaseOrder(
        id=f"pu_{uuid.uuid4().hex[:8]}",
        po_number=po_num,
        supplier_id=sup.id if sup else "s1",
        total=total_cost,
        status="Pending",
        date=datetime.utcnow(),
    )
    db.add(new_po)

    po_item = models.PurchaseOrderItem(
        id=f"poi_{uuid.uuid4().hex[:8]}",
        po_id=new_po.id,
        product_id=prod.id,
        quantity=quantity,
        cost=prod.cost,
    )
    db.add(po_item)
    db.commit()

    return {
        "success": True,
        "poNumber": po_num,
        "message": f"✅ Purchase Order **{po_num}** successfully issued to **{sup.name if sup else 'Supplier'}** for **{quantity} units** (₹{total_cost:,.2f}). It is now tracked in your Purchases ledger.",
    }

def tool_list_pending_orders(db: Session) -> Dict[str, Any]:
    pending = db.query(models.Order).filter(models.Order.status == "Pending").order_by(models.Order.date.desc()).all()
    if not pending:
        return {
            "count": 0,
            "message": "All customer orders have been reviewed and accepted! There are currently no pending orders.",
        }

    lines = [f"Found **{len(pending)} pending customer orders** awaiting your acceptance:"]
    for o in pending:
        item_names = [f"{i.quantity}x {i.product.name if i.product else 'Item'}" for i in o.items]
        summary = ", ".join(item_names) if item_names else f"{len(o.items)} item(s)"
        lines.append(f"• **{o.invoice}** from **{o.customer}** — {summary} (₹{o.total:,.2f})")
    
    first_pending = pending[0]
    return {
        "count": len(pending),
        "action": {
            "type": "ACCEPT_ORDER",
            "invoice": first_pending.invoice,
            "orderId": first_pending.id,
            "customer": first_pending.customer,
            "total": first_pending.total,
        },
        "message": "\n".join(lines),
    }

def tool_accept_customer_order(query: str, db: Session) -> Dict[str, Any]:
    q = query.strip()
    order = db.query(models.Order).filter(
        (models.Order.invoice.ilike(f"%{q}%")) | (models.Order.customer.ilike(f"%{q}%"))
    ).filter(models.Order.status == "Pending").first()

    if not order:
        already = db.query(models.Order).filter(
            (models.Order.invoice.ilike(f"%{q}%")) | (models.Order.customer.ilike(f"%{q}%"))
        ).first()
        if already:
            return {"message": f"Order **{already.invoice}** from **{already.customer}** is already `{already.status}`."}
        return {"message": f"No pending customer order found matching '{query}'."}

    for item in order.items:
        prod = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if prod:
            if prod.quantity < item.quantity:
                return {
                    "message": f"❌ Cannot accept order **{order.invoice}**: Insufficient stock for **{prod.name}**. Available: {prod.quantity}, Required: {item.quantity}."
                }
            prod.quantity -= item.quantity
            tx = models.InventoryTransaction(
                id=f"tx_{uuid.uuid4().hex[:8]}",
                product_id=prod.id,
                type="stock-out",
                quantity_change=-item.quantity,
                timestamp=datetime.utcnow(),
                notes=f"Supplier accepted customer order {order.invoice} for {order.customer}",
            )
            db.add(tx)

    order.status = "Accepted"
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "invoice": order.invoice,
        "message": f"✅ Order **{order.invoice}** from **{order.customer}** has been accepted! Product stock deducted from inventory ledger.",
    }

# --- Groq LLM Copilot Engine ---

def query_groq_llm(user_prompt: str, db: Session) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not Groq or not api_key:
        return None

    model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()

    try:
        # Build live database snapshot for context
        products = db.query(models.Product).all()
        categories = db.query(models.Category).all()
        suppliers = db.query(models.Supplier).all()
        pending_orders = db.query(models.Order).filter(models.Order.status == "Pending").all()

        total_val = sum((p.quantity or 0) * (p.price or 0) for p in products)
        low_stock_prods = [p for p in products if 0 < (p.quantity or 0) <= (p.reorder_level or 10)]
        out_of_stock_prods = [p for p in products if (p.quantity or 0) <= 0]

        catalog_summary = []
        for p in products[:40]:
            cat = p.category_obj.name if p.category_obj else "General"
            sup = p.supplier_obj.name if p.supplier_obj else "Direct"
            catalog_summary.append(
                f"- SKU: {p.sku} | Name: {p.name} | Qty: {p.quantity} | MinReorder: {p.reorder_level} | Price: ₹{p.price:.2f} | Cost: ₹{p.cost:.2f} | Cat: {cat} | Sup: {sup}"
            )
        catalog_str = "\n".join(catalog_summary) if catalog_summary else "No products in catalog yet."

        pending_orders_summary = []
        for o in pending_orders:
            pending_orders_summary.append(f"- Invoice: {o.invoice} | Customer: {o.customer} | Total: ₹{o.total:.2f}")
        pending_str = "\n".join(pending_orders_summary) if pending_orders_summary else "None"

        system_prompt = f"""You are StockPilot AI Copilot, an enterprise inventory, supply chain, and warehouse operations assistant.
You have direct, real-time access to the user's live warehouse database.

CRITICAL BOUNDARY & ANTI-HALLUCINATION RULES:
1. STRICT DOMAIN ENFORCEMENT:
   - You MUST ONLY answer questions strictly related to this warehouse's inventory management: products, SKUs, stock levels, categories, suppliers, purchase orders, sales orders, warehouse valuation, and restocking.
   - You MUST NEVER answer off-topic, unrelated, or unnecessary questions (e.g. general knowledge, history, geography, weather, sports, politics, casual banter, jokes, recipes, poems, general coding, essays, or personal advice).

2. OUT-OF-CONTEXT REFUSAL:
   - If the user asks ANY question or gives ANY prompt that is not related to inventory or warehouse operations, you MUST IMMEDIATELY refuse and respond with EXACTLY this structure:
     "⚠️ **Out of Context**

I am the StockPilot AI Copilot, dedicated exclusively to managing your warehouse inventory, products, stock levels, suppliers, and purchase/sales orders.

Please ask me queries related to your warehouse operations, such as:
• *'What is our current warehouse stock status?'*
• *'List all active product categories'*
• *'What products are low on stock?'*
• *'Draft a purchase order for 25 units of [Product]'*"

3. ZERO HALLUCINATION POLICY:
   - Base all statements STRICTLY and EXCLUSIVELY on the LIVE DATABASE CONTEXT provided below.
   - NEVER invent, assume, or fabricate products, SKUs, suppliers, prices, costs, or quantities.
   - If the user asks about an item or SKU that does NOT exist in the catalog, state clearly: "Product/Item '<name/sku>' was not found in your warehouse catalog." Do NOT make up hypothetical stock or specifications.
   - If the catalog is empty, state clearly that 0 products are currently registered in the database.

4. PURCHASE ORDERS & REORDER ACTIONS:
   - If the user requests to draft a purchase order or reorder an existing product (e.g. 'reorder 20 units of X' or 'draft PO for Y'):
     - Look up the matching product in the catalog.
     - If found, explain the PO details (product, quantity, supplier, estimated cost = cost * qty) and at the very end of your message on a new line output:
       ACTION_PO:{{"productId":"<PRODUCT_ID>","sku":"<SKU>","productName":"<NAME>","supplierName":"<SUPPLIER>","quantity":<QTY>,"estimatedCost":<COST>}}
     - If the product does NOT exist in the catalog, inform the user that the product was not found and ask them to register the product first.

5. ORDER ACCEPTANCE ACTIONS:
   - If the user asks to accept a customer order (e.g. 'accept order INV-10245'):
     - Check if it matches a pending order. If found, explain the order acceptance and on a new line output:
       ACTION_ORDER:{{"invoice":"<INVOICE>"}}

LIVE DATABASE CONTEXT:
• Total Active SKUs: {len(products)}
• Total Inventory Valuation: ₹{total_val:,.2f}
• Out of Stock Count: {len(out_of_stock_prods)}
• Low Stock Count: {len(low_stock_prods)}
• Total Categories: {len(categories)} ({', '.join(c.name for c in categories) if categories else 'None'})
• Total Suppliers: {len(suppliers)} ({', '.join(s.name for s in suppliers) if suppliers else 'None'})
• Pending Customer Orders: {len(pending_orders)}

PRODUCT CATALOG SNAPSHOT:
{catalog_str}

PENDING CUSTOMER ORDERS:
{pending_str}
"""

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model=model_name,
            temperature=0.0,
            max_tokens=800,
        )

        content = response.choices[0].message.content or ""

        # Check for embedded action payloads
        action = None
        po_match = re.search(r"ACTION_PO:(\{.*?\})", content, re.DOTALL)
        if po_match:
            try:
                raw_json = po_match.group(1)
                data = json.loads(raw_json)
                data["type"] = "APPROVE_PO"
                action = data
                content = content.replace(po_match.group(0), "").strip()
            except Exception:
                pass

        order_match = re.search(r"ACTION_ORDER:(\{.*?\})", content, re.DOTALL)
        if order_match:
            try:
                raw_json = order_match.group(1)
                data = json.loads(raw_json)
                data["type"] = "ACCEPT_ORDER"
                action = data
                content = content.replace(order_match.group(0), "").strip()
            except Exception:
                pass

        return {
            "message": content,
            "action": action,
        }
    except Exception as e:
        print("Groq Copilot API error, falling back to local tools:", e)
        return None

# --- Core Agent Dispatcher ---

def run_agent_turn(user_prompt: str, db: Session, action_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # 1. Handle direct action confirmation (e.g. user clicked Approve PO or Accept Order)
    if action_payload:
        if action_payload.get("type") == "APPROVE_PO":
            prod_id = action_payload.get("productId")
            qty = int(action_payload.get("quantity", 1))
            return tool_execute_purchase_order(prod_id, qty, db)
        elif action_payload.get("type") == "ACCEPT_ORDER":
            target = action_payload.get("invoice") or action_payload.get("orderId")
            return tool_accept_customer_order(str(target), db)

    # 2. Try Groq AI Copilot first
    groq_result = query_groq_llm(user_prompt, db)
    if groq_result and groq_result.get("message"):
        return groq_result

    # 3. Fallback to local rule-based engine if Groq is unavailable
    text = user_prompt.strip().lower()

    # 2. Check for Supplier accepting customer order
    # e.g. "accept order INV-10245", "accept order", "approve order Denver Build"
    if "accept" in text and ("order" in text or "inv" in text or "customer" in text):
        order_q = ""
        inv_match = re.search(r"inv-?\d+", text, re.IGNORECASE)
        if inv_match:
            order_q = inv_match.group(0).upper()
            if not order_q.startswith("INV-"):
                order_q = "INV-" + order_q.replace("INV", "")
        else:
            order_q = re.sub(r"(accept|order|the|customer|please)", "", text).strip()
            if not order_q:
                first_pending = db.query(models.Order).filter(models.Order.status == "Pending").order_by(models.Order.date.desc()).first()
                if first_pending:
                    order_q = first_pending.invoice
        return tool_accept_customer_order(order_q or "", db)

    # 3. Check for viewing pending customer orders
    if any(k in text for k in ["pending order", "customer order", "orders to accept", "pending sales", "incoming order"]):
        return tool_list_pending_orders(db)

    # 4. Check for Purchase Order / Reorder intent
    # e.g., "reorder 50 units of angle grinder", "buy 20 PWR-2201", "draft PO for hammer"
    reorder_match = re.search(r"(?:reorder|order|buy|purchase|draft po)\s*(?:for\s*)?(?:(\d+)\s*(?:units|pcs)?\s*(?:of\s*)?)?([a-zA-Z0-9\-\s\.]+)", text)
    if ("reorder" in text or "draft po" in text or "buy" in text or "purchase" in text) and not ("last purchase" in text or "purchases" == text):
        qty = 25
        qty_match = re.search(r"\b(\d+)\b", text)
        if qty_match:
            qty = int(qty_match.group(1))

        # Extract product query
        prod_query = re.sub(r"(reorder|draft po|purchase order|buy|units|pcs|of|for|\d+)", "", text).strip()
        if prod_query:
            return tool_draft_purchase_order(prod_query, qty, db)

    # 3. Low stock / stockout queries
    if any(k in text for k in ["low stock", "out of stock", "stockout", "what is low", "need reorder", "depleted"]):
        return tool_list_low_stock(db)

    # 4. Inventory Valuation / Stats queries
    if any(k in text for k in ["total inventory", "valuation", "worth", "how much stock", "summary", "kpi"]):
        return tool_get_inventory_summary(db)

    # 5. Specific Product Stock queries
    # e.g., "what is the stock of drill?", "check PWR-2201", "how many hammer do we have?"
    if any(k in text for k in ["stock of", "quantity of", "how many", "check", "sku", "price of"]) or any(p in text for p in ["drill", "grinder", "hammer", "wrench", "goggles", "gloves", "bolt", "anchor", "wire", "outlet", "saw", "tape"]):
        # Extract keywords
        clean = re.sub(r"(what is the|stock of|quantity of|how many|do we have|check|sku|price of|can you|tell me about|\?)", "", text).strip()
        if clean:
            return tool_get_stock_status(clean, db)

    # 6. Recent Sales / Activity queries
    if any(k in text for k in ["last sale", "latest order", "recent activity", "last purchase", "transactions"]):
        recent = db.query(models.InventoryTransaction).order_by(models.InventoryTransaction.timestamp.desc()).limit(3).all()
        if recent:
            msg = "**Recent Warehouse Ledger Activity:**\n" + "\n".join(
                f"• `{t.type}` {t.product.name if t.product else 'Item'} ({'+' if t.quantity_change > 0 else ''}{t.quantity_change}) — {t.notes or ''}"
                for t in recent
            )
            return {"message": msg}

    # 7. Conversational Fallback / Capability Guide
    return {
        "message": (
            "I'm your **StockPilot AI Copilot**. I have real-time access to your warehouse database. You can ask me to:\n\n"
            "• **Check stock**: *'What is the stock of 18V Cordless Drill?'* or *'Check PWR-2214'*\n"
            "• **Find shortages**: *'What products are low on stock?'*\n"
            "• **Draft POs & Reorder**: *'Reorder 40 units of Angle Grinder'* or *'Draft PO for PWR-2201 quantity 30'*\n"
            "• **View KPIs**: *'What is our total inventory valuation?'*\n"
            "• **Audit log**: *'Show recent warehouse transactions'*"
        )
    }
