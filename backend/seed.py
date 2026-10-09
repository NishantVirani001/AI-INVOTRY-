import sys
import os
from datetime import datetime
import bcrypt

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import SessionLocal, engine, Base
import backend.models.core as models

def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Seed Users
        if not db.query(models.User).first():
            print("Seeding Users...")
            default_pw = hash_pw("password123")
            users = [
                models.User(id="u1", name="Ava Whitfield", email="admin@stockpilot.io", hashed_password=default_pw, role="Admin", avatar_color="#F5C518"),
                models.User(id="u2", name="Marcus Reyes", email="manager@stockpilot.io", hashed_password=default_pw, role="Manager", avatar_color="#4C8DFF"),
                models.User(id="u3", name="Priya Nair", email="employee@stockpilot.io", hashed_password=default_pw, role="Employee", avatar_color="#33C481"),
            ]
            db.add_all(users)


        if not db.query(models.Category).first():
            print("Seeding Categories...")
            categories = [
                models.Category(id="c1", name="Power Tools", description="Cordless & corded power equipment"),
                models.Category(id="c2", name="Hand Tools", description="Wrenches, hammers, screwdrivers"),
                models.Category(id="c3", name="Safety Gear", description="PPE and protective equipment"),
                models.Category(id="c4", name="Fasteners", description="Bolts, screws, anchors"),
                models.Category(id="c5", name="Electrical", description="Wiring, conduit, switches"),
            ]
            db.add_all(categories)

        if not db.query(models.Supplier).first():
            print("Seeding Suppliers...")
            suppliers = [
                models.Supplier(id="s1", name="Northgate Distribution", contact="Lena Ford", email="lena@northgate.co", phone="+1 415 555 0132", rating=4.6),
                models.Supplier(id="s2", name="Ironclad Wholesale", contact="Diego Marin", email="diego@ironclad.co", phone="+1 312 555 0187", rating=4.2),
                models.Supplier(id="s3", name="Summit Hardware Co.", contact="Rachel Kim", email="rachel@summithw.com", phone="+1 206 555 0144", rating=4.8),
                models.Supplier(id="s4", name="Pacific Fastener Supply", contact="Omar Haddad", email="omar@pacfast.com", phone="+1 503 555 0199", rating=4.4),
            ]
            db.add_all(suppliers)
        db.commit()

        if not db.query(models.Product).first():
            print("Seeding Products...")
            products = [
                models.Product(id="p1", sku="PWR-2201", name="18V Cordless Drill", category_id="c1", supplier_id="s1", price=89.99, cost=54.0, quantity=42, reorder_level=15, safety_stock=5),
                models.Product(id="p2", sku="PWR-2214", name="Angle Grinder 4.5in", category_id="c1", supplier_id="s1", price=64.5, cost=38.2, quantity=8, reorder_level=12, safety_stock=5),
                models.Product(id="p3", sku="HND-1042", name="Claw Hammer 16oz", category_id="c2", supplier_id="s3", price=18.75, cost=9.4, quantity=130, reorder_level=30, safety_stock=10),
                models.Product(id="p4", sku="HND-1077", name="Adjustable Wrench 10in", category_id="c2", supplier_id="s3", price=22.0, cost=11.5, quantity=0, reorder_level=20, safety_stock=5),
                models.Product(id="p5", sku="SFT-3305", name="Safety Goggles (Clear)", category_id="c3", supplier_id="s2", price=6.5, cost=2.8, quantity=210, reorder_level=50, safety_stock=15, expiry_date=datetime(2027, 3, 1)),
                models.Product(id="p6", sku="SFT-3320", name="Nitrile Gloves (Box 100)", category_id="c3", supplier_id="s2", price=14.25, cost=8.1, quantity=6, reorder_level=25, safety_stock=10, expiry_date=datetime(2026, 8, 15)),
                models.Product(id="p7", sku="FST-5510", name="M8 Hex Bolt (Pack 200)", category_id="c4", supplier_id="s4", price=11.0, cost=5.4, quantity=340, reorder_level=60, safety_stock=20),
                models.Product(id="p8", sku="FST-5522", name="Wall Anchor Kit", category_id="c4", supplier_id="s4", price=9.4, cost=4.6, quantity=18, reorder_level=20, safety_stock=5),
                models.Product(id="p9", sku="ELC-7701", name="12AWG Wire Spool 100ft", category_id="c5", supplier_id="s1", price=41.0, cost=26.0, quantity=0, reorder_level=10, safety_stock=3),
                models.Product(id="p10", sku="ELC-7715", name="Duplex Outlet (10 pack)", category_id="c5", supplier_id="s2", price=27.5, cost=15.9, quantity=55, reorder_level=15, safety_stock=5),
                models.Product(id="p11", sku="PWR-2230", name="Reciprocating Saw", category_id="c1", supplier_id="s2", price=112.0, cost=71.0, quantity=5, reorder_level=10, safety_stock=3),
                models.Product(id="p12", sku="HND-1090", name="Tape Measure 25ft", category_id="c2", supplier_id="s3", price=12.99, cost=6.2, quantity=88, reorder_level=20, safety_stock=5),
            ]
            db.add_all(products)
            db.commit()

        if not db.query(models.Order).first():
            print("Seeding Orders (Sales)...")
            orders = [
                models.Order(id="sl1", invoice="INV-10245", customer="Riverside Contractors", total=512.4, status="Completed", date=datetime(2026, 7, 31)),
                models.Order(id="sl2", invoice="INV-10244", customer="Denver Build Co.", total=178.25, status="Completed", date=datetime(2026, 7, 31)),
                models.Order(id="sl3", invoice="INV-10243", customer="Harlow Renovations", total=894.1, status="Completed", date=datetime(2026, 7, 30)),
                models.Order(id="sl4", invoice="INV-10242", customer="Union Electric LLC", total=82.0, status="Refunded", date=datetime(2026, 7, 29)),
                models.Order(id="sl5", invoice="INV-10241", customer="Riverside Contractors", total=1204.6, status="Completed", date=datetime(2026, 7, 28)),
            ]
            db.add_all(orders)

            order_items = [
                models.OrderItem(id="oi1", order_id="sl1", product_id="p1", quantity=4, price=89.99),
                models.OrderItem(id="oi2", order_id="sl1", product_id="p2", quantity=2, price=64.50),
                models.OrderItem(id="oi3", order_id="sl2", product_id="p3", quantity=5, price=18.75),
                models.OrderItem(id="oi4", order_id="sl3", product_id="p10", quantity=10, price=27.50),
                models.OrderItem(id="oi5", order_id="sl5", product_id="p11", quantity=6, price=112.00),
            ]
            db.add_all(order_items)

        if not db.query(models.PurchaseOrder).first():
            print("Seeding Purchase Orders...")
            pos = [
                models.PurchaseOrder(id="pu1", po_number="PO-5591", supplier_id="s1", total=2160.0, status="Received", date=datetime(2026, 7, 30)),
                models.PurchaseOrder(id="pu2", po_number="PO-5590", supplier_id="s2", total=1420.5, status="Pending", date=datetime(2026, 7, 29)),
                models.PurchaseOrder(id="pu3", po_number="PO-5589", supplier_id="s4", total=980.0, status="Received", date=datetime(2026, 7, 26)),
            ]
            db.add_all(pos)

            po_items = [
                models.PurchaseOrderItem(id="poi1", po_id="pu1", product_id="p1", quantity=40, cost=54.0),
                models.PurchaseOrderItem(id="poi2", po_id="pu2", product_id="p2", quantity=25, cost=38.2),
                models.PurchaseOrderItem(id="poi3", po_id="pu3", product_id="p7", quantity=200, cost=5.4),
            ]
            db.add_all(po_items)

        if not db.query(models.InventoryTransaction).first():
            print("Seeding Initial Inventory Transactions...")
            txs = [
                models.InventoryTransaction(id="tx1", product_id="p1", type="stock-in", quantity_change=40, timestamp=datetime(2026, 7, 30), notes="PO-5591 Received"),
                models.InventoryTransaction(id="tx2", product_id="p1", type="stock-out", quantity_change=-4, timestamp=datetime(2026, 7, 31), notes="Order INV-10245"),
                models.InventoryTransaction(id="tx3", product_id="p2", type="stock-out", quantity_change=-2, timestamp=datetime(2026, 7, 31), notes="Order INV-10245"),
            ]
            db.add_all(txs)


        # Seed Customers
        if not db.query(models.Customer).first():
            print("Seeding Customers...")
            customers = [
                models.Customer(id="cu1", name="Denver Build Co.", email="orders@denverbuild.com", phone="+1 720 555 0111", total_orders=34, total_spent=18420.5, last_order_date=datetime(2026, 7, 29)),
                models.Customer(id="cu2", name="Harlow Renovations", email="purchasing@harlow.com", phone="+1 646 555 0199", total_orders=21, total_spent=9210.0, last_order_date=datetime(2026, 7, 25)),
                models.Customer(id="cu3", name="Union Electric LLC", email="supply@unionelectric.com", phone="+1 312 555 0122", total_orders=12, total_spent=5340.75, last_order_date=datetime(2026, 7, 18)),
                models.Customer(id="cu4", name="Riverside Contractors", email="ap@riversidecon.com", phone="+1 415 555 0166", total_orders=47, total_spent=26810.2, last_order_date=datetime(2026, 7, 31)),
            ]
            db.add_all(customers)

        # Seed Warehouses & Locations
        if not db.query(models.Warehouse).first():
            print("Seeding Warehouses and Locations...")
            w1 = models.Warehouse(id="wh1", name="Central Distribution Hub", code="WH-CENTRAL", address="1000 Industrial Parkway, Denver, CO")
            w2 = models.Warehouse(id="wh2", name="Pacific Coast Depot", code="WH-PACIFIC", address="450 Harbor Way, Seattle, WA")
            db.add_all([w1, w2])
            db.flush()

            loc1 = models.Location(id="loc1", warehouse_id="wh1", name="Aisle 1 / Shelf A", type="internal")
            loc2 = models.Location(id="loc2", warehouse_id="wh1", name="Aisle 2 / Shelf B", type="internal")
            loc3 = models.Location(id="loc3", warehouse_id="wh1", name="Receiving Bay", type="internal")
            loc4 = models.Location(id="loc4", warehouse_id="wh1", name="Scrap / Spoilage", type="loss")
            loc5 = models.Location(id="loc5", warehouse_id="wh2", name="Main Stock Bay", type="internal")
            db.add_all([loc1, loc2, loc3, loc4, loc5])
            db.flush()

            # Seed sample stock quants
            quants = [
                models.StockQuant(id="sq1", product_id="p1", location_id="loc1", quantity=30, lot_number="LOT-2026-A1"),
                models.StockQuant(id="sq2", product_id="p1", location_id="loc5", quantity=12, lot_number="LOT-2026-A2"),
                models.StockQuant(id="sq3", product_id="p2", location_id="loc2", quantity=8, lot_number="LOT-2026-B1"),
            ]
            db.add_all(quants)

        db.commit()
        print("Database successfully seeded with realistic data!")
    except Exception as e:
        db.rollback()
        print("Error during seeding:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()

